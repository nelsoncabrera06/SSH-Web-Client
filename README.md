# SSH Web Client

Cliente de SSH que corre en el navegador. Un servidor Node.js hace de puente:
recibe los datos de conexión desde una página web y abre la sesión SSH real
contra el host destino, después transmite la terminal (entrada y salida) en
vivo entre el navegador y esa sesión usando WebSockets.

En criollo: en vez de abrir una terminal y correr `ssh usuario@host`, completás
un formulario en el navegador y operás la terminal remota ahí mismo, en una
terminal real dentro de la página.

## Cómo funciona

- **Backend** (`index.js`): un server Express + Socket.IO que, al recibir los
  datos de conexión (host, puerto, usuario), abre una sesión SSH con
  [`ssh2`](https://github.com/mscdex/ssh2). Soporta varios métodos de
  autenticación: `publickey` (usando tu clave privada), `password` plano y
  `keyboard-interactive` (prompts de contraseña y doble factor), probando
  cada uno según lo que el server acepte. Una vez conectado, abre un shell
  remoto y reenvía su salida al navegador, y los comandos que se tipean en el
  navegador al shell remoto.
- **Frontend** (`index.html`, `js/ssh.js`): un formulario para cargar
  host/puerto/usuario y una terminal real (usando
  [xterm.js](https://xtermjs.org/)) conectada al backend por Socket.IO, que
  interpreta colores y demás secuencias de escape como una terminal de
  verdad.

### Jump host / `~/.ssh/config`

Al conectar, el server lee el `~/.ssh/config` de la máquina donde corre (en
runtime, nada de esto queda hardcodeado en el código ni sube a este repo). Si
para ese host tenés configurado un `ProxyCommand`/`ProxyJump` (para llegar a
través de un jump host), la app primero abre esa conexión y desde ahí
tunelea hacia el destino, igual que haría tu cliente `ssh` de terminal.
También toma de ahí `HostName`, `User` e `IdentityFile` si están definidos
para ese host.

## Requisitos

- Node.js
- Acceso de red al host SSH destino (directo, o a través del jump host que
  tengas configurado en `~/.ssh/config`)

## Uso

```bash
npm install
npm start
```

Después abrí `http://localhost:8080/` en el navegador, completá host, puerto
y usuario, y conectá.

## Notas

Es un proyecto personal pensado para uso en `localhost`: no tiene
autenticación propia en la app web ni corre sobre HTTPS, así que no está
pensado para exponerse en una red compartida o en internet tal cual está.
Ver `Cosas para mejorar/Mejorar.txt` para el detalle de mejoras pendientes.

## get fun!

https://youtu.be/s2HfdZp7S-w?t=9

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/s2HfdZp7S-w/0.jpg)](https://www.youtube.com/watch?v=s2HfdZp7S-w)
