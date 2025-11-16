



// show canvas after 1 big batch so it shows 60hz or smth

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