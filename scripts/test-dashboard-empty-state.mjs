import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  calcularMetricasAsistencia,
  cargarReporteDashboard,
  crearParametrosReporte,
} from '../src/utils/dashboardAsistencia.js';

test('HTTP 200 con lista vacía conserva el estado vacío y métricas en cero', async () => {
  const reporte = await cargarReporteDashboard({
    request: async () => ({ data: [] }),
    params: {},
  });
  const metricas = calcularMetricasAsistencia(reporte);

  assert.deepEqual(reporte, []);
  assert.deepEqual(
    { ...metricas, porcentaje: metricas.porcentaje(0) },
    {
      total: 0,
      presentes: 0,
      ausentes: 0,
      tardanzas: 0,
      justificados: 0,
      porcentaje: 0,
    },
  );
});

test('registros reales calculan estados y porcentajes', () => {
  const metricas = calcularMetricasAsistencia([
    { estado: 'presente' },
    { estado: 'presente' },
    { estado: 'falta' },
    { estado: 'tardanza' },
    { estado: 'justificado' },
  ]);

  assert.equal(metricas.total, 5);
  assert.equal(metricas.presentes, 2);
  assert.equal(metricas.ausentes, 1);
  assert.equal(metricas.tardanzas, 1);
  assert.equal(metricas.justificados, 1);
  assert.equal(metricas.porcentaje(metricas.presentes), 40);
});

test('un error HTTP se propaga y no activa mocks', async () => {
  const mocks = [{ estado: 'presente' }];
  await assert.rejects(
    cargarReporteDashboard({
      request: async () => {
        throw new Error('API no disponible');
      },
      params: {},
      usarMocksDesarrollo: true,
      mocks,
    }),
    /API no disponible/,
  );
});

test('filtro de sección se envía correctamente', () => {
  assert.deepEqual(crearParametrosReporte({ seccion: '4B' }), { seccion: '4B' });
});

test('filtro de fecha se envía correctamente', () => {
  assert.deepEqual(crearParametrosReporte({ fecha: '2026-08-02' }), {
    fecha: '2026-08-02',
  });
});

test('sección y fecha combinadas se envían correctamente', () => {
  assert.deepEqual(
    crearParametrosReporte({ seccion: '4B', fecha: '2026-08-02' }),
    { seccion: '4B', fecha: '2026-08-02' },
  );
});

test('los mocks requieren una bandera explícita de desarrollo', async () => {
  const mocks = [{ estado: 'presente' }];
  const produccion = await cargarReporteDashboard({
    request: async () => ({ data: [] }),
    params: {},
    usarMocksDesarrollo: false,
    mocks,
  });
  const desarrolloExplicito = await cargarReporteDashboard({
    request: async () => ({ data: [] }),
    params: {},
    usarMocksDesarrollo: true,
    mocks,
  });

  assert.deepEqual(produccion, []);
  assert.deepEqual(desarrolloExplicito, mocks);
});

test('la estructura móvil conserva tarjetas y controles dentro del viewport', async () => {
  const source = await readFile(new URL('../src/pages/Dashboard.jsx', import.meta.url), 'utf8');
  assert.match(source, /grid grid-cols-2 md:flex/);
  assert.match(source, /grid grid-cols-1 lg:grid-cols-/);
  assert.match(source, /grid grid-cols-2 lg:contents/);
  assert.match(source, /className="w-full md:w-auto/);
  assert.doesNotMatch(source, /min-w-\[(?:4|5|6|7|8|9)\d{2}px\]/);
});

test('el Dashboard no importa ni altera el Reporte Pedagógico', async () => {
  const source = await readFile(new URL('../src/pages/Dashboard.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /ReportePedagogicoAulaVirtual/);
});
