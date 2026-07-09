"""jobs — antrean tugas manual (ai_job): user minta "hitung ulang / jalankan sekarang".

Go menaruh job (status=pending); worker poller ambil (FOR UPDATE SKIP LOCKED), jalankan
komputasi utk 1 channel (prioritas, di luar irama harian), tandai done/error. Ref: dok 05.
"""
