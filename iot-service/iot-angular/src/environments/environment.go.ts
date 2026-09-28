// Environment for Go backend (beta)
// Usage: ng serve --configuration=go
// Go backend running on http://localhost:3000

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
    scadaUrl: 'http://localhost:4300',
  backendType: 'go-beta',
  // Basemap CARTO. Sejak 2026 CARTO mewajibkan key: tanpa key tile ditimpa
  // watermark "API KEY REQUIRED". Ambil key gratis (5 jt request/bulan) di
  // https://carto.com/basemaps — cukup masukkan email, tak perlu password.
  cartoApiKey: 'cb1_40yq_1_b8ba76a1ffddb130ac686319',
};
