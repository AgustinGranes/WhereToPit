// ─── CONFIG ───────────────────────────────────────────────────────────────────
const FX_API_KEY = 'fxr_live_a11627c992803c65baf4ada7ed8a3c8e8691';
const COMMISSION  = 1.08; // +8% comisión tarjeta

// Fallback en caso de fallo total de la API
// Basado en tasas aproximadas al 09-May-2026
const FALLBACK_USD_ARS = 1434;
const FALLBACK_FX = {
    EUR: 0.8484,   // EUR por 1 USD
    GBP: 0.7336,   // GBP por 1 USD
    JPY: 156.69,   // JPY por 1 USD
    AUD: 1.3799,   // AUD por 1 USD
    NZD: 1.6761,   // NZD por 1 USD
    BRL: 4.8958,   // BRL por 1 USD
};

let _usdArs = null;   // ARS por 1 USD
let _fxRates = null;  // Unidades de moneda por 1 USD (de fxRatesAPI)
let _ratesTs  = 0;

// ─── FETCH ────────────────────────────────────────────────────────────────────
async function fetchRealRates() {
    if (_usdArs && _fxRates && Date.now() - _ratesTs < 3_600_000) return;

    // 1. Dólar MEP (lo que realmente se usa en compras del exterior en Argentina)
    try {
        const res = await fetch('https://dolarapi.com/v1/dolares/bolsa');
        const data = await res.json();
        const venta = parseFloat(data.venta);
        if (venta > 500 && venta < 5000) {
            _usdArs = venta;
        }
    } catch (_) {}
    if (!_usdArs) _usdArs = FALLBACK_USD_ARS;

    // 2. Tasas de cruce de monedas desde fxRatesAPI (base USD)
    try {
        const res = await fetch(
            `https://api.fxratesapi.com/latest?api_key=${FX_API_KEY}&base=USD&currencies=EUR,GBP,JPY,AUD,NZD,BRL`
        );
        const data = await res.json();
        if (data.success && data.rates) {
            _fxRates = data.rates;
        }
    } catch (_) {}
    if (!_fxRates) _fxRates = FALLBACK_FX;

    _ratesTs = Date.now();
}

// ─── CONVERSION ───────────────────────────────────────────────────────────────
// Fórmula: amount_X → USD → ARS → +8%
// rateX = unidades de X por 1 USD
// => 1 X = (1/rateX) USD = (1/rateX) * _usdArs ARS
async function convertToARS(amount, currency) {
    if (!amount || amount === 0) return 0;
    await fetchRealRates();

    if (currency === 'ARS') return amount * COMMISSION;

    if (currency === 'USD') return amount * _usdArs * COMMISSION;

    const rateVsUsd = _fxRates[currency] ?? FALLBACK_FX[currency] ?? 1;
    const arsPerUnit = (1 / rateVsUsd) * _usdArs;
    return amount * arsPerUnit * COMMISSION;
}

function formatPrice(ars) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(ars);
}

// ─── RATE SUMMARY for UI ──────────────────────────────────────────────────────
async function getRateSummary() {
    await fetchRealRates();
    const eur = _fxRates?.EUR ? ((1 / _fxRates.EUR) * _usdArs).toFixed(0) : '—';
    const gbp = _fxRates?.GBP ? ((1 / _fxRates.GBP) * _usdArs).toFixed(0) : '—';
    return `USD Bolsa: $${_usdArs?.toFixed(0)} · 1 EUR = $${eur} · 1 GBP = $${gbp} · +8% inc.`;
}
