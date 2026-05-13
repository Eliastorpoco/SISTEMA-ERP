export default function Proximamente({ titulo = 'Módulo' }) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-indigo-500">
            <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">{titulo}</h1>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Este módulo está en desarrollo y estará disponible próximamente.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          En construcción
        </div>
      </div>
    </div>
  );
}
