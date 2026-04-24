# Production Checklist

Este checklist es obligatorio antes de cualquier deploy de produccion.

## Auth

- [ ] Login owner (`zsayeth09@gmail.com` o cuenta CEO activa).
- [ ] Login seller (cuenta activa con `sellerId` valido).
- [ ] Logout y retorno correcto a login.
- [ ] Reingreso mantiene sesion sin errores de perfil.

## Ventas

- [ ] Venta CH completa (agregar al carrito y confirmar ticket).
- [ ] Venta PL completa (validaciones de numero y monto correctas).
- [ ] Venta BL completa (cantidad maxima y costo unitario correctos).
- [ ] Carrito permite sumar/restar/eliminar sin crash.
- [ ] Confirmar ticket genera registro persistente.
- [ ] Compartir ticket funciona (nativo/web o descarga fallback).
- [ ] Recargar app y verificar persistencia del ticket.

## Roles

- [ ] Seller solo ve modulos permitidos.
- [ ] Admin no ve zona exclusiva owner.
- [ ] CEO/owner ve todos los modulos requeridos.
- [ ] Programador mantiene accesos tecnicos habilitados.

## Datos

- [ ] Tickets operativos filtran por `sellerId`.
- [ ] Resultados bloquean venta cuando aplica por sorteo/fecha.
- [ ] Injections/settlements cargan bajo demanda (sin realtime continuo).
- [ ] Archive se comporta como consulta historica (sin edicion directa).
- [ ] Cierres generan/exportan reporte correctamente.

## Fetch Puntual

- [ ] Pantallas con datos puntuales muestran estado de carga.
- [ ] Boton `Refrescar` disponible y funcional.
- [ ] Error de carga muestra toast entendible.
- [ ] Estado vacio es claro cuando no hay datos.

## Hardening

- [ ] No hay crashes por callbacks invalidos.
- [ ] No hay accesos `.map/.length/.some` sobre `undefined`.
- [ ] Errores Firebase (`permission-denied`, `failed-precondition`, `unavailable`) muestran toast + log tecnico.

## Build Gate

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Deploy hosting exitoso

