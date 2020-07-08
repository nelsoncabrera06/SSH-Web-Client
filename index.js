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

var pass;
var ped, resp, cam;

app.post('/conectar', function (req, res) {
	console.log('/conectar');
	//res.send('about');
	conectarSSH(req,res);
});


app.post('/banner', function (req, res) { 
	console.log('/banner');
	ped = req;
	resp = res;
});

app.post('/password', function (req, res) { 
	console.log('/password');
	ped = req;
	resp = res;
});

/*
http.listen(3000, () => {
  console.log('listening on *:3000');
});
*/


http.listen(PUERTO, () => {
	console.log("Servidor activo - index.js");
	IP_privada = networkInterfaces['Conexión de área local'][1].address; //esto con cable Ethernet - caso de PC Virtal en servidor
	if (networkInterfaces['Ethernet 2']){
		IP_privada_TECO = networkInterfaces['Ethernet 2'][2].address	// este caso es para VPN cuando hago HOME OFFICE
		console.log("IP_privada_TECO : "+ IP_privada_TECO);
	}
	if (networkInterfaces['Wi-Fi']){
		IP_privada_WiFi = networkInterfaces['Wi-Fi'][1].address			// Wifi de mi casa
		console.log("IP_privada_WiFi : "+ IP_privada_WiFi);
	}
	//IP_privada = networkInterfaces;
	console.log(IP_privada);
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
var readline = require('readline')
const linealeida = require('readline-sync');
var conn = new Client();

function conectarSSH(dato){
	//console.log('function conectarSSH');

	//console.log(dato); // esto esta bien
	conn.connect({
		host: dato.host, // mediadorured
		port: dato.port,
		username: dato.user,	// esto deberia cargarlo dede mi pag
		//password: 'PASSWORD' // or provide a privateKey
		tryKeyboard: true,
		//debug: console.log,
		readyTimeout: 40000 // entiendo que son 40 segundos
	});
	
	io.emit('conectar', "conectando...");
	
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
   
conn.on('banner', function (message, language){
	console.log('Connection :: banner');
	console.log(message);		
	io.emit('banner', message);
});

var finalizar;
conn.on('keyboard-interactive',function (name, instructions, lang, prompts, finish) { // esto sería en el plano
	console.log('Connection :: keyboard-interactive');
	if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
		mensaje = prompts[0].prompt;
		console.log(mensaje);
		//devolucion = {evento:'keyboard-interactive', mensaje: mensaje};
		//respuesta.end(JSON.stringify(devolucion));
		//resp.end(JSON.stringify(devolucion));
		io.emit('password', mensaje);
		finalizar = finish;
		//respuesta.end(password); // PROBANDO
	} else if ( prompts.length > 0 && prompts[0].prompt.includes('Doble_Factor:')) {
		mensaje = prompts[0].prompt;
		console.log(mensaje)
		//devolucion = {evento:'Doble_Factor', mensaje: mensaje};
		//resp.end(JSON.stringify(devolucion));
		io.emit('Doble_Factor', mensaje);
		finalizar = finish;
		
	} else console.log(prompts);
});


conn.on('ready', function() {
	mensaje = 'Client :: ready';
	console.log(mensaje);
	//io.emit('ready', mensaje);
	//devolucion = {evento:'ready', mensaje: mensaje + '\n'};
	//resp.end(JSON.stringify(devolucion)); todavía no voy a responderlo
	shell_connection();
});

conn.on('error', function() {
	mensaje = 'Client :: error';
	console.log(mensaje);
	io.emit('error', mensaje);
	//devolucion = {evento:'error', mensaje: mensaje };
	//resp.end(JSON.stringify(devolucion)); 
});

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