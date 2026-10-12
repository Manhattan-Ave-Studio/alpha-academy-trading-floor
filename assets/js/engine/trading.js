// Order engine used by demo mode. It mirrors the database rules in
// supabase/migrations/20261011000300_trading.sql (same checks, same math, same messages),
// and tests/engine/engine.test.mjs runs the same scenarios as the SQL tests.

export class OrderError extends Error {}

export const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
export const round4 = (x) => Math.round((x + Number.EPSILON) * 1e4) / 1e4;
export const round6 = (x) => Math.round((x + Number.EPSILON) * 1e6) / 1e6;
const trunc6 = (x) => Math.trunc(x * 1e6 + 1e-9) / 1e6;
const fmtMoney = (v) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 6 });

/** 'fill' | 'trigger' | 'wait' for an open order at a price. */
export function orderDecision(o, price) {
  const limitOk = (o.side === 'buy' && price <= o.limit_price) || (o.side === 'sell' && price >= o.limit_price);
  if (o.order_type === 'market') return 'fill';
  if (o.order_type === 'limit') return limitOk ? 'fill' : 'wait';
  if (!o.stop_triggered) {
    const hit = (o.side === 'buy' && price >= o.stop_price) || (o.side === 'sell' && price <= o.stop_price);
    if (!hit) return 'wait';
    return o.order_type === 'stop' || limitOk ? 'fill' : 'trigger';
  }
  return o.order_type === 'stop' || limitOk ? 'fill' : 'wait';
}

export function reservedCash(state, priceOf, commission = 0) {
  return state.orders
    .filter((o) => o.status === 'open' && o.side === 'buy')
    .reduce((sum, o) => {
      const est = o.notional != null
        ? o.notional
        : round2(o.qty * (o.limit_price ?? Math.max(o.stop_price ?? 0, priceOf(o.symbol) ?? 0)));
      return sum + est + commission;
    }, 0);
}

export function portfolioValue(state, priceOf) {
  let v = state.cash;
  for (const [sym, p] of Object.entries(state.positions)) v += p.qty * (priceOf(sym) ?? p.avg_cost);
  return v;
}

/**
 * Validates and normalizes an order. Throws OrderError with the same wording as the database.
 * ctx: { game, state, symbolInfo, quote, input, now, priceOf }
 */
export function validateOrder({ game, state, symbolInfo, quote, input, now, priceOf }) {
  const side = input.side;
  const type = input.order_type;
  const tif = input.time_in_force || 'day';
  const qty = input.qty == null || input.qty === '' ? null : round6(Number(input.qty));
  const notional = input.notional == null || input.notional === '' ? null : round2(Number(input.notional));
  const limit = input.limit_price == null || input.limit_price === '' ? null : Number(input.limit_price);
  const stop = input.stop_price == null || input.stop_price === '' ? null : Number(input.stop_price);
  const symbol = String(input.symbol || '').trim().toUpperCase();
  const note = input.note ? String(input.note).trim() : '';

  if (game.status === 'paused') throw new OrderError('Trading is paused for this game. Check back with your mentor.');
  if (game.status === 'ended' || (game.ends_at && now >= Date.parse(game.ends_at))) throw new OrderError('This game has ended. Trading is closed.');
  if (now < Date.parse(game.starts_at)) throw new OrderError('This game has not opened for trading yet.');
  if (!['buy', 'sell'].includes(side)) throw new OrderError('Choose Buy or Sell.');
  if (!['market', 'limit', 'stop', 'stop_limit'].includes(type)) throw new OrderError('Choose an order type.');
  if (!['day', 'gtc'].includes(tif)) throw new OrderError('Choose how long the order lasts: Day or Good til canceled.');
  if ((qty == null) === (notional == null)) throw new OrderError('Enter a number of shares or a dollar amount.');
  if (notional != null && (side !== 'buy' || type !== 'market')) throw new OrderError('Dollar amounts work for market buy orders. Use shares for this order type.');
  if (notional != null && !game.allow_fractional) throw new OrderError('Fractional shares are off in this game, so buy whole shares instead of a dollar amount.');
  if (notional != null && notional < 1) throw new OrderError('Dollar orders must be at least $1.');
  if (qty != null && !(qty > 0)) throw new OrderError('Shares must be more than zero.');
  if (qty != null && !game.allow_fractional && qty !== Math.trunc(qty)) throw new OrderError('Fractional shares are off in this game. Use a whole number of shares.');
  if (qty != null && qty > 10000000) throw new OrderError('That order is too large.');
  if ((type === 'limit' || type === 'stop_limit') && !(limit > 0)) throw new OrderError('Enter a limit price.');
  if ((type === 'stop' || type === 'stop_limit') && !(stop > 0)) throw new OrderError('Enter a stop price.');
  if (note.length > 280) throw new OrderError('Keep your note to 280 characters or fewer.');
  const recent = state.orders.filter((o) => now - Date.parse(o.created_at) < 60000).length;
  if (recent >= 20) throw new OrderError('Too many orders in the last minute. Take a breath and try again shortly.');
  if (!symbolInfo || symbolInfo.tradable === false) throw new OrderError(`${symbol} is not available to trade in this game.`);
  if (!quote || !(quote.price > 0)) throw new OrderError(`No price is loaded for ${symbol} yet. Open its page to load a price, then try again.`);

  const commission = Number(game.commission || 0);
  if (side === 'buy') {
    if (quote.price < Number(game.min_share_price || 0)) {
      throw new OrderError(`This game does not allow buying shares priced under ${fmtMoney(game.min_share_price)}.`);
    }
    const estPrice = type === 'limit' || type === 'stop_limit' ? limit : type === 'stop' ? Math.max(stop, quote.price) : quote.price;
    const estCost = (notional ?? round2(qty * estPrice)) + commission;
    const available = state.cash - reservedCash(state, priceOf, commission);
    if (estCost > available + 0.005) {
      throw new OrderError(`Not enough buying power. This order needs about ${fmtMoney(estCost)}, and you have ${fmtMoney(Math.max(available, 0))} available.`);
    }
    if (game.max_position_pct != null && symbolInfo.asset_type !== 'etf') {
      const total = portfolioValue(state, priceOf);
      const held = state.positions[symbol];
      const posValue = (held ? held.qty * quote.price : 0) + (estCost - commission);
      const pctNow = (posValue / total) * 100;
      if (total > 0 && pctNow > Number(game.max_position_pct) + 0.0001) {
        throw new OrderError(`This trade would put ${pctNow.toFixed(1)}% of your portfolio in ${symbol}. The game limit for one stock is ${Number(game.max_position_pct)}%. Funds like SPY are exempt.`);
      }
    }
  } else {
    const held = state.positions[symbol]?.qty ?? 0;
    const reserved = state.orders
      .filter((o) => o.status === 'open' && o.side === 'sell' && o.symbol === symbol)
      .reduce((s, o) => s + o.qty, 0);
    if (held <= 0) throw new OrderError(`You do not own any shares of ${symbol}.`);
    if (qty > held - reserved + 0.0000005) {
      throw new OrderError(`You can sell up to ${fmtQty(Math.max(held - reserved, 0))} shares of ${symbol} right now (shares in open sell orders are set aside).`);
    }
  }

  return {
    symbol,
    side,
    order_type: type,
    qty,
    notional,
    limit_price: type === 'limit' || type === 'stop_limit' ? round4(limit) : null,
    stop_price: type === 'stop' || type === 'stop_limit' ? round4(stop) : null,
    time_in_force: type === 'market' ? 'day' : tif,
    note: note || null
  };
}

let seq = 0;
export function newId(prefix) {
  seq = (seq + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Executes a fill, updating state in place. Returns the updated order. */
export function applyFill(state, order, price, game, nowIso) {
  if (order.status !== 'open') return order;
  const fee = Number(game.commission || 0);
  const reject = (reason) => Object.assign(order, { status: 'rejected', reason, updated_at: nowIso });

  if (order.side === 'buy') {
    const qty = order.qty ?? trunc6(order.notional / price);
    if (!(qty > 0)) return reject('That amount is too small to buy any shares at the current price.');
    const gross = round2(qty * price);
    if (gross + fee > state.cash + 0.005) return reject('Not enough cash when the order was ready to fill.');
    state.cash = round4(state.cash - gross - fee);
    const pos = state.positions[order.symbol];
    if (pos) {
      const newQty = round6(pos.qty + qty);
      pos.avg_cost = round4((pos.qty * pos.avg_cost + gross + fee) / newQty);
      pos.qty = newQty;
      pos.updated_at = nowIso;
    } else {
      state.positions[order.symbol] = { qty, avg_cost: round4((gross + fee) / qty), opened_at: nowIso, updated_at: nowIso };
    }
    state.transactions.unshift({
      id: newId('t'), order_id: order.id, kind: 'buy', symbol: order.symbol, qty, price,
      amount: -(gross + fee), fee, realized_pl: null, cash_after: state.cash, note: null, created_at: nowIso
    });
    Object.assign(order, { status: 'filled', filled_qty: qty, filled_price: price, filled_at: nowIso, updated_at: nowIso });
    return order;
  }

  const pos = state.positions[order.symbol];
  if (!pos || pos.qty + 0.0000005 < order.qty) return reject('You no longer own enough shares to fill this sell order.');
  const qty = Math.min(order.qty, pos.qty);
  const gross = round2(qty * price);
  const cash = state.cash + gross - fee;
  if (cash < 0) return reject('The commission is larger than this sale.');
  const realized = round4(gross - fee - round2(qty * pos.avg_cost));
  state.cash = round4(cash);
  state.realized_pl = round4((state.realized_pl || 0) + realized);
  const left = round6(pos.qty - qty);
  if (left < 0.000001) delete state.positions[order.symbol];
  else {
    pos.qty = left;
    pos.updated_at = nowIso;
  }
  state.transactions.unshift({
    id: newId('t'), order_id: order.id, kind: 'sell', symbol: order.symbol, qty, price,
    amount: gross - fee, fee, realized_pl: realized, cash_after: state.cash, note: null, created_at: nowIso
  });
  Object.assign(order, { status: 'filled', filled_qty: qty, filled_price: price, filled_at: nowIso, updated_at: nowIso });
  return order;
}

/** Runs open orders against current prices. Returns the orders that changed. */
export function processOpenOrders(state, priceOf, game, nowIso, { canFill = () => true } = {}) {
  const changed = [];
  const open = state.orders.filter((o) => o.status === 'open').sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const o of open) {
    if (!canFill(o)) continue;
    const p = priceOf(o.symbol);
    if (!(p > 0)) continue;
    const decision = orderDecision(o, p);
    if (decision === 'fill') {
      applyFill(state, o, p, game, nowIso);
      changed.push(o);
    } else if (decision === 'trigger') {
      o.stop_triggered = true;
      o.updated_at = nowIso;
      changed.push(o);
    }
  }
  return changed;
}
