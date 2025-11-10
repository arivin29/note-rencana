# Sensor Detail Page - Guide

## Overview
Halaman detail sensor dengan tabel data pembacaan yang dilengkapi filtering dan pagination.

## Features

### 1. **Sensor Information Cards**
- Menampilkan informasi sensor (Type, Location, Unit, Total Readings)
- Icon dengan gradient background
- Responsive design

### 2. **Data Table**
Tabel data pembacaan sensor dengan kolom:
- **ID**: Nomor urut pembacaan
- **Timestamp**: Tanggal dan waktu pembacaan
- **Nilai**: Nilai pembacaan dengan satuan
- **Status**: Badge status (online, warning, error, offline)
- **Kualitas**: Persentase kualitas data (0-100%)
- **Catatan**: Informasi tambahan jika ada

### 3. **Filter Periode**
Pilihan periode data:
- Hari Ini
- Kemarin
- 7 Hari Terakhir
- 30 Hari Terakhir
- Bulan Ini
- Bulan Lalu
- **Custom Range**: Pilih tanggal dari-sampai

### 4. **Filter Status**
Filter berdasarkan status sensor:
- Semua Status
- Online
- Warning
- Error
- Offline

### 5. **Pagination**
- Pilihan items per page: 10, 25, 50, 100
- Navigasi halaman: First, Previous, Page Numbers, Next, Last
- Menampilkan info: "Menampilkan X - Y dari Z data"
- Smart page numbers dengan ellipsis untuk banyak halaman

### 6. **Export to CSV**
- Export data yang sudah difilter ke file CSV
- File name: `sensor-[name]-[timestamp].csv`

## Routing

```typescript
// URL Pattern
/iot/nodes/:nodeId/sensor/:sensorId

// Example
/iot/nodes/node-123/sensor/sensor-456
```

## Component Structure

```
sensor-chanel-detail/
├── sensor-chanel-detail.ts       # Component logic
├── sensor-chanel-detail.html     # Template
└── sensor-chanel-detail.scss     # Styling
```

## Usage Example

### Navigate to Sensor Detail
```typescript
// From node detail page
this.router.navigate(['/iot/nodes', nodeId, 'sensor', sensorId]);
```

### Component Usage
```html
<!-- Router outlet will render this automatically -->
<router-outlet></router-outlet>
```

## Data Model

```typescript
interface SensorReading {
  id: number;
  timestamp: Date;
  value: number;
  unit: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  quality: number;  // 0-100%
  notes?: string;
}
```

## Key Methods

### applyFilters()
Menerapkan filter periode dan status pada data

### goToPage(page: number)
Navigasi ke halaman tertentu

### onPageSizeChange()
Handle perubahan jumlah items per page

### getPageNumbers()
Generate array nomor halaman dengan smart ellipsis

### exportToCSV()
Export data terfilter ke CSV file

## Customization

### Change Dummy Data
Edit method `generateDummyData()` di TypeScript:
```typescript
generateDummyData() {
  // Customize data generation logic here
}
```

### Change Page Size Options
Edit property `pageSizeOptions`:
```typescript
pageSizeOptions: number[] = [10, 25, 50, 100];
```

### Add Custom Filters
1. Add filter property
2. Update `applyFilters()` method
3. Add filter UI in template

## Styling

### Colors
- Success: `#10B981` (green)
- Warning: `#F59E0B` (yellow)
- Error: `#EF4444` (red)
- Info: `#3B82F6` (blue)
- Secondary: `#6B7280` (gray)

### Responsive
- Desktop: Full table with all columns
- Mobile: Adjusted font sizes and compact layout

## Integration with Real API

Replace dummy data dengan real API call:

```typescript
ngOnInit() {
  // Get sensor ID from route
  this.route.params.subscribe(params => {
    const sensorId = params['sensorId'];
    this.loadSensorData(sensorId);
  });
}

loadSensorData(sensorId: string) {
  this.sensorService.getReadings(sensorId, {
    period: this.selectedPeriod,
    status: this.selectedStatus,
    page: this.currentPage,
    pageSize: this.pageSize
  }).subscribe(response => {
    this.allReadings = response.data;
    this.totalRecords = response.total;
    this.applyFilters();
  });
}
```

## Notes

- Component menggunakan dummy data (150 readings)
- Data di-generate otomatis dengan random values dan status
- Pagination bekerja client-side (untuk demo)
- Untuk production, gunakan server-side pagination untuk performa lebih baik

## Future Enhancements

1. **Grafik/Chart**: Tambahkan visualisasi data dengan ApexCharts
2. **Real-time Updates**: WebSocket untuk update data real-time
3. **Advanced Filters**: Filter by value range, quality threshold
4. **Bulk Actions**: Select multiple rows untuk export/delete
5. **Data Analytics**: Statistical summary, trends, anomaly detection
