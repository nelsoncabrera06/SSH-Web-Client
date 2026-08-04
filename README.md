# SSH Web Client

Cliente de SSH que corre en el navegador. Un servidor Node.js hace de puente:
recibe los datos de conexión desde una página web y abre la sesión SSH real
contra el host destino, después transmite la terminal (entrada y salida) en
vivo entre el navegador y esa sesión usando WebSockets.

En criollo: en vez de abrir una terminal y correr `ssh usuario@host`, completás
un formulario en el navegador y operás la terminal remota ahí mismo, como una
consola web.

## Cómo funciona

- **Backend** (`index.js`): un server Express + Socket.IO que, al recibir los
  datos de conexión (host, puerto, usuario), abre una sesión SSH con
  [`ssh2`](https://github.com/mscdex/ssh2). Soporta autenticación interactiva
  (`keyboard-interactive`), incluyendo prompts de contraseña y doble factor.
  Una vez conectado, abre un shell remoto y reenvía su salida al navegador,
  y los comandos que se tipean en el navegador al shell remoto.
- **Frontend** (`index.html`, `js/ssh.js`): un formulario simple para cargar
  host/puerto/usuario y un área de texto que hace de "terminal", conectado al
  backend por Socket.IO.

## Requisitos

- Node.js
- Acceso de red al host SSH destino

## Uso

```bash
npm install
node index.js
```

Después abrí `http://localhost:8080/` en el navegador, completá host, puerto
y usuario, y conectá.

## Notas

Es un proyecto personal pensado para uso en `localhost`: no tiene
autenticación propia en la app web ni corre sobre HTTPS, así que no está
pensado para exponerse en una red compartida o en internet tal cual está.
Ver `Cosas para mejorar/Mejorar.txt` para el detalle de mejoras pendientes.

https://youtu.be/s2HfdZp7S-w?t=9

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/s2HfdZp7S-w/0.jpg)](https://www.youtube.com/watch?v=s2HfdZp7S-w)
