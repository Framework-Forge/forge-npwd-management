import React from 'react';

const ManagementSvg = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#09141a" />
    <circle cx="24" cy="24" r="19" fill="#064e3b" fillOpacity="0.4" stroke="#059669" strokeWidth="1.5" />
    <path
      d="M24 10L35 15V23C35 30 29.5 35.5 24 37.5C18.5 35.5 13 30 13 23V15L24 10Z"
      fill="url(#mgmtGrad)"
      stroke="#34d399"
      strokeWidth="1.5"
    />
    <path
      d="M20 23V20C20 18.9 20.9 18 22 18H26C27.1 18 28 18.9 28 20V23M18 23H30C30.6 23 31 23.4 31 24V30C31 30.6 30.6 31 30 31H18C17.4 31 17 30.6 17 30V24C17 23.4 17.4 23 18 23Z"
      stroke="#ffffff"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="27" r="1.25" fill="#34d399" />
    <defs>
      <linearGradient id="mgmtGrad" x1="13" y1="10" x2="35" y2="37.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#059669" />
        <stop offset="1" stopColor="#047857" />
      </linearGradient>
    </defs>
  </svg>
);

export const ManagementAppIcon = () => <ManagementSvg size={40} />;
export const NotificationIcon = () => <ManagementSvg size={32} />;

export default ManagementAppIcon;
