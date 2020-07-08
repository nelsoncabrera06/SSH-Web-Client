
alert("el js anda!");

var Origen = document.getElementById('equipoabuscar'); 		// este seria el origen
var Destino = document.getElementById('areadetexto');			// este seria el destino
var Comando = document.getElementById('comando');
var host = document.getElementById('host');
var port = document.getElementById('port');
var user = document.getElementById('user');


var estado = 'desconectado';

var socket = io();
function enviarComan2(){
	//socket.emit('chat message', 'cualquier cosa para probar');
	console.log('estado '+ estado);
	if (estado!='desconectado'){

		var data = {
			comando: Comando.value,
			estado : estado
		};
		// voy a enviar un comando en formato json y la respuesta debe ser de igual forma en json

		socket.emit('comando', data);
		Comando.value = '';
	} else {
		esperandoRespuesta.innerHTML = '';
		alert('Primero debe conectarse');
	}
	
};
		
socket.on('conectar', function(msg){
	//Destino.textContent += msg + "\n";	// esta es la posta!!
	Destino.textContent = msg + "\n";	
	esperandoRespuesta.innerHTML = '';
});

socket.on('banner', function(msg){
	//Destino.textContent += msg + "\n";	// esta es la posta!!
	Destino.textContent = msg ;	// pero solo a modo de prueba
	esperandoRespuesta.innerHTML = '';
	estado = 'banner';
});

socket.on('password', function(msg){
	//Destino.textContent += msg + "\n";	// esta es la posta!!
	Destino.textContent += msg ;	// pero solo a modo de prueba
	esperandoRespuesta.innerHTML = '';
	estado = 'password'; 
	Comando.style.background = "#505363"; //le cambio el color
	Comando.setAttribute("type", "password"); // y que sea oculto
	Comando.focus();
	Comando.select();	
});

socket.on('Doble_Factor', function(msg){
	//Destino.textContent += msg + "\n";	// esta es la posta!!
	Destino.textContent += msg + "\n";	// pero solo a modo de prueba
	esperandoRespuesta.innerHTML = '';
	estado = 'Doble_Factor';
	Comando.style.background = "#505363"; //le cambio el color
	Comando.setAttribute("type", "password"); // y que sea oculto
	Comando.focus();
	Comando.select();	
});

socket.on('ready', function(msg){
	Destino.textContent += msg ;	// pero solo a modo de prueba
	esperandoRespuesta.innerHTML = '';
	estado = 'ready'; 
	//window.scrollTo(0, Comando.offsetTop); // esto scrollea la ventana entera anda bien!
	Destino.scrollTo(0, Destino.scrollHeight); // esto anda perfecto solo scrollea el Destino element
	if (msg.match(/password/gi)) { // si no matchea con el signo $ la tengo que llamar de nuevo
		Comando.style.background = "#505363"; //le cambio el color
		Comando.setAttribute("type", "password"); // y que sea oculto 
	} else {
		Comando.style.background = "black"; //le cambio el color a negro
		Comando.setAttribute("type", "text"); // y que sea vea
	}
	
	
});

socket.on('error', function(msg){
	Destino.textContent += msg ;	// pero solo a modo de prueba
	esperandoRespuesta.innerHTML = '';
	estado = 'error'; 
});

socket.on('exit', function(msg){
	Destino.textContent += msg ;	
	esperandoRespuesta.innerHTML = '';
	estado = 'exit'; 
});

function conectar(){
	//alert('conectar');
	esperandoRespuesta.innerHTML = 'esperando respuesta...';
	
	var url = 'conectar';
	/*var data = {
		user: 'u564508',
		host: 'mediadorured', // mediadorured o '10.75.220.33' funciona de las dos maneras
		port: 22
	};*/

	var data = {
		user: user.value,
		host: host.value, // mediadorured o '10.75.220.33' funciona de las dos maneras
		port: port.value
	};
	
	socket.emit(url, data);

	estado = url;

	
}



var esperandoRespuesta = document.getElementById('respuesta');
function runScript(e) { // esto es si apreto enter
    //See notes about 'which' and 'key'
    if (e.keyCode == 13) { // si fue un ENTER
		
		
		switch (estado) {
			case 'banner': // cuando estoy enviando el password
				Destino.textContent += Comando.value.replace(/\S/g, '*') + "\n";
				break;
			case 'password':
				Destino.textContent += Comando.value.replace(/\S/g, '*') + "\n";
				break;
			default:
				break;
		}
		
		esperandoRespuesta.innerHTML = 'esperando respuesta...';
		
        //eval(tb.value);
        //return false;
		//enviarApretado();
		//enviarComando();
		enviarComan2();

    }
}


function enviarComando(){
	
	var url = 'comando';
	var data = {comando: Comando.value};
	// voy a enviar un comando en formato json y la respuesta debe ser de igual forma en json
	
	switch (estado) {
		case 'banner':
			estado = 'password';
			break;
		case 'password':
			estado = 'Doble_Factor';
			break;
		case 'Doble_Factor':
			estado = 'ready';
			break;
		default:
			//Destino.textContent += myJson.mensaje + "\n";
			//console.log(myJson.evento + ' respuesta = ' + myJson.mensaje);
			break;
	}
	
	data.estado = estado;
	console.log(url + ' - estado ' + estado);
	fetch(url, {
	  method: 'POST', // or 'PUT'
	  body: JSON.stringify(data), // data can be `string` or {object}!
	  headers:{
		'Content-Type': 'application/json'
	  }
	})
	.then(function(response) {
		esperandoRespuesta.innerHTML = '';
		return response.json(); // convierto la respuesta en json
		})
	.then(function(myJson) {
		//console.log(myJson);	// esto lo veo en la consola del navegador
		switch (myJson.evento) {
			case 'Doble_Factor':
				Destino.textContent += myJson.mensaje ;
				break;
			case 'ready':
				Destino.textContent += myJson.mensaje ;
				
				if (!String(myJson.mensaje).match(/\$/g)) { // si no matchea con el signo $ la tengo que llamar de nuevo
					enviarURL('escuchar'); 
				} 
				
				
				break;
			case 'exit':
				Destino.textContent += myJson.mensaje ;
				break;
			default:
				Destino.textContent += myJson.mensaje + "\n";
				console.log(myJson.evento + ' respuesta = ' + myJson.mensaje);
				break;
		}
	});
	
	Comando.value = '';
	
}



function enviarURL(url){
	
	esperandoRespuesta.innerHTML = 'esperando respuesta...';
	
	estado = url;
	console.log(url);
	fetch(url)
	.then(function(response) {
		esperandoRespuesta.innerHTML = '';
		return response.json(); // convierto la respuesta en json
		})
	.then(function(myJson) {
		Destino.textContent += myJson.mensaje ;
		if (!String(myJson.mensaje).match(/\$/g)) { // si no matchea con el signo $ la tengo que llamar de nuevo
			enviarURL('escuchar'); 
		} 
	}).catch(function(error) {
	  console.log('Hubo un problema con la petición Fetch:' + error.message);
	});
		
}





function enviarApretado(){
	var url = Origen.value;
	
	console.log(url);
	fetch(url).then(function(response) { 	// ir a buscar en la url luego con la respuesta
	//fetch('enviardatos').then(function(response) { 	// ir a buscar en la url luego con la respuesta
		response.text().then(function(text) {	// con la respuesta abre una funcion
			Destino.textContent += text + "\n";		// donde el contenido lo pone en Destino que seria el <pre>
			
			/*
			var areadeteclado = document.createElement("pre");
			areadeteclado.className = "consola";
			areadeteclado.innerHTML = ">";
			document.getElementById('areadetexto').appendChild(areadeteclado);
			*/
		});
	});	
}






 

function escuchar(){
	var salir = false;
	var url = '';
	//var data = {};
	
	switch (estado) {
		case 'ready':
			url = 'listo';
			break;
		default :
			url = 'escuchar';
			break;
	}
	
	console.log(url);
	//fetch('escuchar')
	fetch(url)
		.then(function(response) {
			return response.json();
		})
		.then(function(myJson) {
			//console.log(myJson);	// esto lo veo en la consola del navegador
			console.log('respuesta = ' + myJson.mensaje);
			switch (myJson.evento) {
				case 'banner':
					Destino.textContent = myJson.mensaje ;		// donde el contenido lo pone en Destino que seria el <pre>
					escuchar();
					break;
				case 'keyboard-interactive':
					Destino.textContent += myJson.mensaje ;		// donde el contenido lo pone en Destino que seria el <pre>
					Comando.style.display = "block";
					estado = 'myJson.mensaje'; // esto podria ser 'Password:' o 'Doble_Factor:'
					break;
				case 'ready':
					Destino.textContent += myJson.mensaje + "\n" ;		// donde el contenido lo pone en Destino que seria el <pre>
					estado = 'ready';
					//alert(estado); // esto esta perfecto!!
					
					if (myJson.mensaje.match(/close/g)){
						estado = 'fin';
						console.log('estado = fin');
					} else if (!myJson.mensaje.match(/\$/g)) { 
						ready(); // si no matchea con el signo $ la tengo que llamar de nuevo
					}  
					
					
					//ready();
					//escuchar();
					break;
				case 'error':
					Destino.textContent += myJson.mensaje + "\n";		// donde el contenido lo pone en Destino que seria el <pre>
					break;
				default :
					alert(myJson.evento);
					salir = true;
					break;
			}
			
		});
}


function ready(){
	
	
	console.log('listo');
	fetch('listo').then(function(response) { 	// ir a buscar en la url luego con la respuesta
		response.text().then(function(text) {	// con la respuesta abre una funcion
			console.log('respuesta = ' + text);
			Destino.textContent += text ;		// donde el contenido lo pone en Destino que seria el <pre>
			
			if (text.match(/close/g)){
				estado = 'fin';
				console.log('estado = fin');
			} else if (!text.match(/\$/g)) { 
				ready(); // si no matchea con el signo $ la tengo que llamar de nuevo
			}  
			
		});
	});
	
}

// alternativa a fetch
// XMLHttpRequest es mas conocido y mas lo mas estandar pero hace lo mismo que lo siguiente
/*
var request = new XMLHttpRequest();		// hace una llamada
request.open('GET', url);				// abre la url (osea el txt correspondiente) 
request.responseType = 'text';			// respuesta tipo text
request.onload = function() {			// cuando se carga la respuesta
  poemDisplay.textContent = request.response;	// se la pone a la etiqueta <pre>
};
request.send();		
*/

