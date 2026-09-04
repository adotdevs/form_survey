import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Internal Revenue Service | An official website of the United States government',
  description: 'Pay your taxes. Get your refund status. Find IRS forms and answers to tax questions.',
  icons: {
    icon: '/images/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className="js" style={{ opacity: 1, visibility: 'visible' }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="icon" href="/images/favicon.ico" type="image/vnd.microsoft.icon" />
        <link rel="stylesheet" media="all" href="/css/css_WZifYMlXqgU-jiWAXqT8DvgnG48DUVfpVCEakdLANig.css" />
        <link rel="stylesheet" media="all" href="/css/css_Fy_RFzuIKLmz1YKXAkd-8-xn95Sr3faz4DZqFW07WJg.css" />
        <link rel="stylesheet" media="print" href="/css/css_Or67IXkhIVm88Pl7Mioo33202U8DmLYQW9TywNGH6OI.css" />
        <link rel="stylesheet" href="/css/inline-head.css" />
        <link rel="stylesheet" href="/css/irs-flow.css" />
        <script src="/signature_pad.umd.min.js" async />
      </head>
      <body
        className="layout-no-sidebars has-featured-top page-node-58476 path-frontpage node--type-pup-home-page bootstrap-barrio lang-en"
        data-once="accordion-beforematch form-single-submit vertical-tabs-fragments sticky-nav-init"
        style={{ opacity: 1, visibility: 'visible' }}
      >
        {children}
      </body>
    </html>
  );
}
