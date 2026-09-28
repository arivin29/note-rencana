export const environment = {
  production: true,
    apiUrl: 'https://iot-backend.helios.vito.devetek.com',
  scadaUrl: 'https://devetek-helios-scada.web.app',
  backendType: 'nestjs',
  // Basemap CARTO. Sejak 2026 CARTO mewajibkan key: tanpa key tile ditimpa
  // watermark "API KEY REQUIRED". Ambil key gratis (5 jt request/bulan) di
  // https://carto.com/basemaps — cukup masukkan email, tak perlu password.
  cartoApiKey: '',
};
