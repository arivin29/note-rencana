// Default development environment — NestJS backend
// Usage: ng serve (default)

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  scadaUrl: 'https://devetek-helios-scada.web.app',
  backendType: 'nestjs',
  // Basemap CARTO. Sejak 2026 CARTO mewajibkan key: tanpa key tile ditimpa
  // watermark "API KEY REQUIRED". Ambil key gratis (5 jt request/bulan) di
  // https://carto.com/basemaps — cukup masukkan email, tak perlu password.
  cartoApiKey: '',
};
