const PUERTO = 8080;
var os = require('os');
var networkInterfaces = os.networkInterfaces();

var app = require('express')();
var http = require('http').createServer(app);
//var http = require('http');
var io = require('socket.io')(http);

var express = require('express');
var path = require('path');

// obtiene la ruta del directorio publico donde se encuentran los elementos estaticos (css, js).
//var publicPath = path.resolve(__dirname, 'public'); //path.join(__dirname, 'public'); también puede ser una opción
var publicPath = path.resolve(__dirname); //path.join(__dirname, 'public'); también puede ser una opción

// Para que los archivos estaticos queden disponibles.
app.use(express.static(publicPath));


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
  //res.sendFile(__dirname + '/public/ssh.html');
});

app.post('/conectar', function (req, res) {
	console.log('/conectar');
	//res.send('about');
	conectarSSH(req,res);
});

/*
http.listen(3000, () => {
  console.log('listening on *:3000');
});
*/


http.listen(PUERTO, () => {
	console.log("Servidor activo - index.js");
	if (networkInterfaces['Conexión de área local'] && networkInterfaces['Conexión de área local'][1]){
		IP_privada = networkInterfaces['Conexión de área local'][1].address; //esto con cable Ethernet - caso de PC Virtal en servidor
		console.log("IP_privada : "+ IP_privada);
	}
	if (networkInterfaces['Ethernet 2']){
		IP_privada_TECO = networkInterfaces['Ethernet 2'][2].address	// este caso es para VPN cuando hago HOME OFFICE
		console.log("IP_privada_TECO : "+ IP_privada_TECO);
	}
	if (networkInterfaces['Wi-Fi']){
		IP_privada_WiFi = networkInterfaces['Wi-Fi'][1].address			// Wifi de mi casa
		console.log("IP_privada_WiFi : "+ IP_privada_WiFi);
	}
	console.log("PUERTO : "+ PUERTO);
});

io.on('connection', (socket) => {
	console.log('Conexión abierta');
	socket.on('chat message', (msg) => {
		console.log(msg);
		//io.emit('chat message', msg);
		
		tiempo();
	});

	socket.on('conectar', (data) => {
		//console.log(data); // esto va como piña
		conectarSSH(data);
	});

	socket.on('comando', (data) => {
		//console.log(data); // esto va como piña
		pasarelComando(data);
	});
});

function tiempo(){
	// esta funcion es para manejar la hora pero no me salio
	function doStuff() {
		let date_ob = new Date();
		let date = ("0" + date_ob.getDate()).slice(-2);
		let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
		let year = date_ob.getFullYear();
		let hours = date_ob.getHours();
		let minutes = date_ob.getMinutes();
		let seconds = date_ob.getSeconds();
		// prints date & time in YYYY-MM-DD HH:MM:SS format
		//mensaje = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
		mensaje = hours + ":" + minutes + ":" + seconds;
		//console.log(mensaje); 
		//respuesta.end(mensaje);
		//respuesta.write(mensaje);
		io.emit('chat message', mensaje);
		
	}
	setInterval(doStuff, 1000); //time is in ms
}

var Client = require('ssh2').Client;
var parseKey = require('ssh2').utils.parseKey;
var readline = require('readline')
const linealeida = require('readline-sync');
var fs = require('fs');
var SSHConfig = require('ssh-config');

var conn; // cliente ssh2 de la conexion final activa (se asigna una vez conectado)
var finalizar; // callback pendiente (password/passphrase/2FA) del hop que este autenticando en ese momento

// Lee ~/.ssh/config de la maquina donde corre el server. A proposito no se hardcodea
// nada de infraestructura especifica aca: todo sale de ese archivo local, en runtime.
function leerConfigSSH(){
	var rutaConfig = path.join(os.homedir(), '.ssh', 'config');
	if (!fs.existsSync(rutaConfig)) return null;
	try {
		return SSHConfig.parse(fs.readFileSync(rutaConfig, 'utf8'));
	} catch (e) {
		console.log('No se pudo parsear ~/.ssh/config: ' + e.message);
		return null;
	}
}

function extraerJumpHost(computed){
	if (computed.proxyjump) return computed.proxyjump.split(',')[0].split('@').pop();
	if (computed.proxycommand) {
		var match = computed.proxycommand.match(/-W\s*\S+\s+(\S+)\s*$/); // patron "ssh -q -W %h:%p <jumphost>"
		if (match) return match[1];
	}
	return null;
}

function resolverHost(alias){
	var config = leerConfigSSH();
	var computed = config ? config.compute(alias, { ignoreCase: true }) : {};
	var identityFiles = computed.identityfile || [];
	var hostname = computed.hostname ? computed.hostname.replace(/%h/g, alias) : alias;
	return {
		hostname: hostname,
		port: computed.port ? parseInt(computed.port, 10) : null,
		user: computed.user || null,
		identityFile: identityFiles.length ? identityFiles[0].replace(/^~/, os.homedir()) : null,
		jumpHost: extraerJumpHost(computed)
	};
}

function crearAuthHandler(usuario, identityFile, etiqueta){
	var intentoPublicKey = false;
	var keyBuffer = null;
	if (identityFile) {
		try { keyBuffer = fs.readFileSync(identityFile); }
		catch (e) { console.log('[' + etiqueta + '] no se pudo leer ' + identityFile + ': ' + e.message); }
	}

	return function (methodsLeft, partialSuccess, callback) {
		if (methodsLeft === null) return callback('none'); // primer intento, para que el server nos diga que metodos acepta

		if (keyBuffer && !intentoPublicKey && methodsLeft.includes('publickey')) {
			intentoPublicKey = true;
			var parsed = parseKey(keyBuffer);
			if (parsed instanceof Error) {
				// la clave esta cifrada, pido la passphrase por la web
				io.emit('password', '[' + etiqueta + '] Passphrase de ' + identityFile + ':');
				finalizar = function (respuestas) {
					var conPassphrase = parseKey(keyBuffer, respuestas[0]);
					if (conPassphrase instanceof Error) {
						io.emit('error', '[' + etiqueta + '] Passphrase incorrecta');
						return callback(false);
					}
					callback({ type: 'publickey', username: usuario, key: conPassphrase });
				};
				return;
			}
			return callback({ type: 'publickey', username: usuario, key: parsed });
		}

		if (methodsLeft.includes('password')) {
			io.emit('password', '[' + etiqueta + '] Password:');
			finalizar = function (respuestas) {
				callback({ type: 'password', username: usuario, password: respuestas[0] });
			};
			return;
		}

		if (methodsLeft.includes('keyboard-interactive')) return callback('keyboard-interactive');

		return callback(false);
	};
}

function crearClienteSSH(etiqueta){
	var cliente = new Client();

	cliente.on('banner', function (message) {
		console.log('[' + etiqueta + '] banner: ' + message);
		io.emit('banner', message);
	});

	cliente.on('keyboard-interactive', function (name, instructions, lang, prompts, finish) {
		if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
			io.emit('password', '[' + etiqueta + '] ' + prompts[0].prompt);
			finalizar = finish;
		} else if (prompts.length > 0 && prompts[0].prompt.includes('Doble_Factor:')) {
			io.emit('Doble_Factor', '[' + etiqueta + '] ' + prompts[0].prompt);
			finalizar = finish;
		} else {
			console.log(prompts);
		}
	});

	return cliente;
}

// Conecta contra `alias` (que puede tener su propia entrada en ~/.ssh/config, con
// jump host incluido). Si hace falta, primero abre una conexion recursiva al jump
// host y tunelea (forwardOut) hacia el destino antes de autenticar ahi.
function abrirConexion(alias, portOverride, userOverride, callback){
	var resuelto = resolverHost(alias);
	var usuarioFinal = userOverride || resuelto.user || os.userInfo().username;
	var puertoFinal = portOverride || resuelto.port || 22;

	function conectarCliente(sockOrigen){
		var cliente = crearClienteSSH(alias);
		var terminado = false;

		cliente.on('ready', function () {
			if (terminado) return;
			terminado = true;
			callback(null, cliente);
		});
		cliente.on('error', function (err) {
			if (terminado) return;
			terminado = true;
			callback(err, null);
		});

		var opciones = {
			host: resuelto.hostname,
			port: puertoFinal,
			username: usuarioFinal,
			tryKeyboard: true,
			readyTimeout: 40000,
			authHandler: crearAuthHandler(usuarioFinal, resuelto.identityFile, alias)
		};
		if (sockOrigen) opciones.sock = sockOrigen;

		cliente.connect(opciones);
	}

	if (resuelto.jumpHost) {
		io.emit('conectar', 'saltando por ' + resuelto.jumpHost + '...');
		abrirConexion(resuelto.jumpHost, null, null, function (err, clienteJump) {
			if (err) return callback(err, null);
			clienteJump.forwardOut('127.0.0.1', 0, resuelto.hostname, puertoFinal, function (err, stream) {
				if (err) return callback(err, null);
				conectarCliente(stream);
			});
		});
	} else {
		conectarCliente(null);
	}
}

function conectarSSH(dato){
	io.emit('conectar', "conectando...");

	abrirConexion(dato.host, dato.port, dato.user, function (err, cliente) {
		if (err) {
			var mensaje = 'Client :: error: ' + (err && err.message ? err.message : err);
			console.log(mensaje);
			io.emit('error', mensaje);
			return;
		}
		conn = cliente;
		shell_connection();
	});
}

function pasarelComando(dato){
	comando = dato.comando;
	estado = dato.estado;
			
	//console.log(comando);
	switch (estado) {
		case 'password':
			finalizar([comando]); // esto va al servidor SSH
			break;
		case 'Doble_Factor':
			finalizar([comando]); // esto va al servidor SSH
			break;
		default:
			//mistream.end(comando_a_enviar); // no recuerdo la diferencia
			mistream.write(comando + '\n');
			break;
	}
	
}


/* ------------------------------------
	aca arranca la parte de SSH
   ------------------------------------ */

var mistream;

function shell_connection(){
	
	
	conn.shell(function(err, stream) {
		if (err) throw err;
		// create readline interface
		var rl = readline.createInterface(process.stdin, process.stdout)
		stream.on('close', function() {
			process.stdout.write('Connection closed.\n')
			console.log('Stream :: close');
			conn.end();
			
			mensaje = 'exit\nConnection closed.\n'
			//devolucion = {evento:'exit', mensaje: mensaje }; 
			//resp.end(JSON.stringify(devolucion)); 
			io.emit('exit', mensaje);
			
		}).on('data', function(data) {
			// pause to prevent more data from coming in
			process.stdin.pause()
			process.stdout.write(data) // creo que aca esta la clave entre pedido y respuesta del server y client
			mensaje = data + '';
			
			io.emit('ready', mensaje);
			/* tengo que el problema que envia espacios en blanco al final
			if (!mensaje.match(/$/g)) {
				io.emit('ready', mensaje.trimEnd());
			} else io.emit('ready', mensaje);
			*/
			process.stdin.resume();
		  	mistream = stream;
		}).stderr.on('data', function(data) {
		  process.stderr.write(data);
		  io.emit('error', data);
		});

		rl.on('line', function (d) {
		  // send data to through the client to the host
		  stream.write(d.trim() + '\n')
		})

		rl.on('SIGINT', function () {
		  // stop input
		  process.stdin.pause()
		  process.stdout.write('\nEnding session\n')
		  rl.close()

		  // close connection
		  stream.end('exit\n');
			io.emit('exit', 'exit');
		})

	});
}


/* ------------------------------------
	aca finaliza la parte de SSH
   ------------------------------------ */