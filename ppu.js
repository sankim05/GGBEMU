import {gabememory} from './memory.js';
import { GABECPU } from './cpu.js';

export class GABEPPU{
    constructor(CPU){
        this.CPU = CPU;
        this.tcycle = 0;
    }
    reset(){
        this.tcycle = 0;
    }
    showscreen(canvasobject){

    }
    cyclerun(){
        this.tcycle++;
    }    

}