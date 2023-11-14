import {config} from "dotenv";
config();
import axios from "axios";
import FormData from "form-data";
import type { IOrientationSetup, IUserStore, ServiceObject } from "./types";
import { ORIENTATION } from "./types";
import { addUser, updateUser, userStore } from "./store";

let tripSetup: IOrientationSetup = {
    [ORIENTATION.GO]: ['17/11/2023','18/11/2023'], //
    [ORIENTATION.BACK]: [], //
}
let tripSetupExcludeTime: IOrientationSetup = {
    [ORIENTATION.GO]: [],
    [ORIENTATION.BACK]: [],
}
let tripSetupIncludeTime: IOrientationSetup = {
    [ORIENTATION.GO]: [],
    [ORIENTATION.BACK]: [],
}

// Define the content to check for
const contentToCheck = 'DISPONIBLES'; // Content to look for in the HTML response


export const sleep = (time: number) => {
  return new Promise((resolve: any) => setTimeout(resolve, time))
}

export const goBackDateToString = (dateObj) => {
    return `${dateObj.fecha_estacion} ${dateObj.hora_estacion}`;
}
export const availableResumeToString = (availObj:any) => {
    return Object.entries(availObj)
        .filter(o => !!o[1])
        .map(o => o[0]+': '+o[1])
        .join('\n');
}
export const tripSetupReadable = () => {
    return {
        [orientationToString(ORIENTATION.GO)]: tripSetup[ORIENTATION.GO],
        [orientationToString(ORIENTATION.BACK)]: tripSetup[ORIENTATION.BACK],
    }
}

export const orientationToString = (orient) => {
    return orient === ORIENTATION.GO ? 'ida' : 'vuelta';
}

export const formatObject = (obj) => {
    try {
        let s = '';
        const isArray = Array.isArray(obj)
        if (!isArray && obj.hora_estacion && obj.fecha_estacion) return goBackDateToString(obj)+'\n';
        if (obj['bebe'] !== undefined || obj['Primera'] !== undefined || obj['Pullman'] !== undefined) return availableResumeToString(obj)+'\n';
        Object.entries(obj).forEach(([k,o]: any[],idx) => {
            if (o !== undefined) {
                if (!isArray) {
                    s += `${k}:`;
                }
                if (typeof o === 'object') {
                    const s1 = formatObject(o);
                    s += `\n ${s1.replace(/\\n/g,'\n ')}`;
                } else {
                    s += ` ${o.toString()}\n`;
                }
            }
        })
        return s;
    } catch (error) {
        return JSON.stringify(obj);
    }
}

var tripDetail = '';
var tripCategories = {} as any;
var tripCosts = {} as any;
export const formatServicesResponse = (response): ServiceObject => {
    if (response.disponibilidad !== undefined) return response;
    const service: any = {
        disponibilidad: 0,
        data: Object.values(response.servicios)
        .map((s:any)=> Object.values(s.servicios)[0]) //.servicios.xxx.servicios.xxx.
        .filter((o: any) => (
            (!tripSetupIncludeTime[o.sentido].length && !tripSetupExcludeTime[o.sentido].length) 
            || (!tripSetupIncludeTime[o.sentido].length && !tripSetupExcludeTime[o.sentido].includes(o.horarios.salida.hora_estacion))
            ||  tripSetupIncludeTime[o.sentido].includes(o.horarios.salida.hora_estacion))
        )
        .map((o: any) => {
            tripDetail = o.nombre_ramal;
            tripCategories = o.categorias;
            tripCosts = o.cuadro_tarifario;
            return {
                fecha: o.fecha_servicio,
                detalle: o.nombre_ramal,
                origen: o.recorrido.origen.nombre,
                destino: o.recorrido.destino.nombre,
                // sentido: orientationToString(o.id_ramal),

                id_servicio: o.id_servicio,
                horarios: {salida: o.horarios.salida, llegada: o.horarios.llegada},
                resumen: Object.entries(o.web).reduce((pre,[k,v]:any[]) => {
                  return  Object.assign(pre,{
                    [tripCategories[k]?.categoria || k] : v.disponibilidad,
                  })
                },{}),
                disponibilidad: Object.values(o.web).reduce((pre,curr:any) => 
                  ( curr.disponibilidad > 0) 
                    ? pre+curr.disponibilidad
                    : pre
                ,0)
            }
        })
        .reduce((pre,curr:any) => {
            let obj: any = pre;
            obj.disponibilidad = curr.disponibilidad + (pre.disponibilidad || 0);
            const _service = {
                origen: curr.origen,
                destino: curr.destino,
                disponibilidad: curr.disponibilidad,
                resumen: curr.resumen,
                horarios: curr.horarios,
                id_servicio: curr.id_servicio,
            };
            if (!pre[curr.fecha]) {
                obj[curr.fecha] = [_service]
            } else {
                obj[curr.fecha].push(_service);
            }
            return obj;
        },{} as any)
    }
    service.detail = tripDetail;
    service.disponibilidad = service.data?.disponibilidad || 0;
    if (response.status === -1) {
        // phpSessionId = ''; 
    } else {
        if (askSessionId_firstRequest) {
            askSessionId_firstRequest = false;
            sendTelegramMessage(`Consulta: ${tripDetail}\n${formatObject(tripSetupReadable())}`);
        }
    }
    return service;
}
export const findFreeSites = (html) => {
    // if (typeof html === 'string')
    //     return new RegExp(` [^0]{1,3} ${contentToCheck}`).exec(html);
    if (typeof html === 'object' && !html.servicios) {
        return formatServicesResponse(html);
    }
    return html
}

export const storeLastServices = (user: IUserStore, services: ServiceObject) => {
    let d;
    const updUser: IUserStore = {...user, lastInfo: services}
    if (!userStore[user.id]) { 
        d = addUser(updUser); 
    } else {
        d = updateUser(updUser)
    }
    return services;
}



const SOFSE_URL = 'https://webventas.sofse.gob.ar/ajax/servicio/obtener_servicios.php';
//POST https://webventas.sofse.gob.ar/ajax/busqueda/obtener_busqueda.php
/*
{
    busqueda: {
        cantidad_pasajeros: {
            adulto: "1",
            bebe: "0",
            discapacitado: "0",
            jubilado: "0",
            menor: "0",
        },
        destino: "481",
        fecha_ida: "14/09/2023",
        fecha_vuelta: "",
        origen: "255",
        tipo_viaje: "1",
    }
    status: 1},
} 
 */
//POST https://webventas.sofse.gob.ar/ajax/busqueda/obtener_estaciones.php 
///id_unico_estacion_seleccionada: 255
/////{id_unico_estacion: "255", nombre: "Mar del Plata", combinacion: "f", ramales: [1, 26]}
/////{id_unico_estacion: "481", nombre: "Buenos Aires", combinacion:"f", ramales: [39, 1, 16, 36, 33, 19, 11, 28, 21, 14, 26, 3, 20, 15, 8]}
//POST https://webventas.sofse.gob.ar/ajax/busqueda/obtener_cantidad_maxima_pasajeros.php
//{id_unico_origen: 255, id_unico_destino: 481}
/////{cantidad_maxima_pasajeros: 8, status: 1}

import readline from 'readline'
import bot, { lastUserId, sendTelegramMessage } from "./bot";

const readLine = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var phpSessionId = ''
var askSessionId_firstRequest = true;
export const setSessionId = (sessionId) => {
    return new Promise((resolve,reject) => {
        if (sessionId.length >= 26 && /^[0-9a-z]+$/.test(sessionId)) {
            phpSessionId = sessionId.substring(0,26);
            askSessionId_firstRequest = true;
            resolve(phpSessionId);
        } else {
            phpSessionId = '';
            reject(phpSessionId);
        }
    })
}

var askSessionId_lastAsk:Date|null = null;
let askSessionId_diffNotif = 1800; // seconds

export const askSessionId = async () => {
    const now = new Date();
    return new Promise((resolve,reject) => {
        if (bot) {
            // delay notification for askSessionId_diffNotif seconds
            if (askSessionId_lastAsk === null ||  now.getTime() - askSessionId_lastAsk.getTime() > askSessionId_diffNotif*1000) {
                askSessionId_lastAsk = now;
                sendTelegramMessage('No funciona el Token actual, envie uno nuevo.');
            } else {
                // not requested for 
            }
        } else {
            readLine.question('Current Session ID? ', setSessionId)
        }
})
}

export const getAllPassages = async() => {
    const requests: any[] = [];
    if (tripSetup[ORIENTATION.GO]) { requests.push(...tripSetup[ORIENTATION.GO].map(t => getPassages(t,ORIENTATION.GO))); }
    if (tripSetup[ORIENTATION.BACK]) { requests.push(...tripSetup[ORIENTATION.BACK].map(t => getPassages(t,ORIENTATION.BACK))); }
    const currentUser: IUserStore = {
        id: lastUserId,
        trip: {
            orientationDate: tripSetup,
            excludeTime: tripSetupExcludeTime,
            includeTime: tripSetupIncludeTime,
        },
        
    };
    
    return Promise.allSettled(requests)
    .then(result => {
        // join GO and BACK responses
        return result.reduce((pre,curr:any) => {
            if (curr.status === 'fulfilled') {
                curr.value.data.servicios = Object.assign(pre?.data?.servicios || {},curr.value.data.servicios);
                return curr.value;
            }
            return pre;
        }, {} as any)
    })
    .then(result => formatServicesResponse(result.data))
    .then(services => storeLastServices(currentUser, services))
}

export const getPassages = async (date, orientation:ORIENTATION) => {
    if (phpSessionId === '') { 
        await askSessionId(); 
        return;
    }
    const headers = {
        Dnt: 1,
        Cookie: `PHPSESSID=${phpSessionId}`,
      //'User-Agent': 'Your User Agent', // Replace with your user agent
      // Add other headers if needed
    }
    const payload = new FormData();
    payload.append('fecha_seleccionada', date);
    payload.append('sentido', orientation);
    
    return axios
    .post(SOFSE_URL, payload, { 
        headers:{
            ...headers,
            ...payload.getHeaders(),
        }
    })
    .then(response => {
        console.log('Consultado:',response.data?.status === 1 ? 'OK' : 'FALLO', orientationToString(orientation), date, (response.data?.sin_disponibilidad !== 0) ? 'NO HAY': 'SI HAY');
        if (response.data.status === -1) {
            // phpSessionId = '';
        } else {
            // add orientation to response
            Object.values(response.data.servicios).forEach((r1:any) => Object.values(r1.servicios).forEach((r2:any) => {r2.sentido = orientation;}))
        }
        return response;
    })
    .catch((error) => {
        console.error('Error getting passage info:', error.message);
        throw error;
    });
}

export const sendServicesInfo = async (services?: ServiceObject, prefix= '', suffix= '', showAll=false) => {
    
    const message = prefix + 
        ((services === undefined) 
            ? `No tenemos datos para mostrar. Consulte nuevamente en un rato.`
        :(services?.disponibilidad) 
            ? `Hay ${services?.disponibilidad} pasajes disponibles!`
            : `No hay pasajes disponibles.`)
    + suffix;

    console.log(message);
    sendTelegramMessage(message);
    await sleep(100);
    Object.entries(services?.data || {}).forEach(([k,v]:any[]) => { 
      if (k !== 'disponibilidad') {
        const key = k;
        v.forEach(v1 => {
          if (showAll || v1.disponibilidad) {
            sendTelegramMessage(`${formatObject({[key]:v1})}`); 
          }
        });
      }
    })
    // Object.entries(freeFound).forEach(s => sendTelegramMessage(`${s[0]}:\n${JSON.stringify(s[1])}`.replace(/fecha_estacion":|hora_estacion":|"/g,'').replace(/,/g,'\n')))
}
