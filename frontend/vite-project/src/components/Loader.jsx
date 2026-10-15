import React from 'react';

const Loader = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
};

export default Loader;
