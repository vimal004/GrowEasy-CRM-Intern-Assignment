import localFont from 'next/font/local';

export const googleSans = localFont({
  src: [
    {
      path: '../assets/fonts/GoogleSans-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/GoogleSans-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../assets/fonts/GoogleSans-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../assets/fonts/GoogleSans-MediumItalic.ttf',
      weight: '500',
      style: 'italic',
    },
    {
      path: '../assets/fonts/GoogleSans-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../assets/fonts/GoogleSans-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-google-sans',
});
