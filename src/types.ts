
export enum ORIENTATION {
    GO = '1',
    BACK = '2',
}
  
export interface IOrientationSetup {
    [ORIENTATION.GO]?: string[] | Date[],
    [ORIENTATION.BACK]?: string[] | Date[],
}
  
export interface ITrip {
    source?: {
      code: number,
      name: string,
    },
    destination?: {
      code: number,
      name: string,
    },
    orientationDate: IOrientationSetup,
    excludeTime: IOrientationSetup,
    includeTime: IOrientationSetup,
}

export interface IUserStore {
    id: number,
    token?: string,
    trip?: ITrip,
    lastInfo?: ServiceObject,
}

export interface AvailableObject {
    disponibilidad: number,
}
export interface ResumeObject extends AvailableObject {
    [x: string]: any,
}
export interface AnyTimes {
    fecha_estacion: string,
    hora_estacion: string,
}
export interface ServiceTimes {
    salida: AnyTimes,
    llegada: AnyTimes,
}
export interface ServiceDetail extends AvailableObject{
    detalle: string,
    id_servicio: number,
    horarios: ServiceTimes,
    resumen: ResumeObject[],
}
export interface ServiceObject extends AvailableObject {
    data: ServiceDetail[],
}
