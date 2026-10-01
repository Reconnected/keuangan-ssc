// Konfigurasi Tailwind CDN (dimuat setelah script Tailwind)
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                tulip: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                }
            }
        }
    }
}
