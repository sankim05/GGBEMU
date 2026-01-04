
export class GABEjoy{
    constructor(memory){
        this.memory = memory;
        this.btnbitsK = 0xF;
        this.dpadbitsK = 0xF;
        this.btnbitsB = 0xF;
        this.dpadbitsB = 0xF;      

        this.lastdih = 0xF;



        const DpadDown =  document.getElementById("DpadDown");
        if(DpadDown){
            DpadDown.addEventListener("mousedown",(obj) =>{
                this.dpadbitsB = this.dpadbitsB & 7;
                DpadDown.style.backgroundColor = "LightGrey";
                this.updateinput(); 
            });
            DpadDown.addEventListener("mouseup",(obj) =>{
                this.dpadbitsB = this.dpadbitsB | 8;
                if(this.dpadbitsK&8){
                    DpadDown.style.backgroundColor = "";
                }
            });                        
        }

        const DpadUp =  document.getElementById("DpadUp");
        if(DpadUp){
            DpadUp.addEventListener("mousedown",(obj) =>{
                this.dpadbitsB = this.dpadbitsB & 0xB;
                DpadUp.style.backgroundColor = "LightGrey";
                this.updateinput();
            });

            DpadUp.addEventListener("mouseup",(obj) =>{
                this.dpadbitsB = this.dpadbitsB | 4;
                if(this.dpadbitsK&4){
                    DpadUp.style.backgroundColor = "";
                }
            });                           
        }

        const DpadLeft =  document.getElementById("DpadLeft");
        if(DpadLeft){
            DpadLeft.addEventListener("mousedown",(obj) =>{
                this.dpadbitsB = this.dpadbitsB & 0xD;
                DpadLeft.style.backgroundColor = "LightGrey";
                this.updateinput();
            });
            DpadLeft.addEventListener("mouseup",(obj) =>{
                this.dpadbitsB = this.dpadbitsB | 2;
                if(this.dpadbitsK&2){
                    DpadLeft.style.backgroundColor = "";
                }
            });                        
        }

        const DpadRight =  document.getElementById("DpadRight");
        if(DpadRight){
            DpadRight.addEventListener("mousedown",(obj) =>{
                this.dpadbitsB = this.dpadbitsB & 0xE;
                DpadRight.style.backgroundColor = "LightGrey";
                this.updateinput();
            });
            DpadRight.addEventListener("mouseup",(obj) =>{
                this.dpadbitsB = this.dpadbitsB | 1;
                if(this.dpadbitsK&1){
                    DpadRight.style.backgroundColor = "";
                }
            });                           
        }

        const BtnStart =  document.getElementById("BtnStart");
        if(BtnStart){
            BtnStart.addEventListener("mousedown",(obj) =>{
                this.btnbitsB = this.btnbitsB & 7;
                BtnStart.style.backgroundColor = "LightGrey";
                this.updateinput();
            });
            BtnStart.addEventListener("mouseup",(obj) =>{
                this.btnbitsB = this.btnbitsB | 8;
                if(this.btnbitsK&8){
                    BtnStart.style.backgroundColor = "";
                }
            });                        
        }


        const BtnSelect =  document.getElementById("BtnSelect");
        if(BtnSelect){
            BtnSelect.addEventListener("mousedown",(obj) =>{
                this.btnbitsB = this.btnbitsB & 0xB;
                BtnSelect.style.backgroundColor = "LightGrey";
                this.updateinput();
            });
            BtnSelect.addEventListener("mouseup",(obj) =>{
                this.btnbitsB = this.btnbitsB | 4;
                if(this.btnbitsK&4){
                    BtnSelect.style.backgroundColor = "";
                }
            });                        
        }


        const BtnB =  document.getElementById("BtnB");
        if(BtnB){
            BtnB.addEventListener("mousedown",(obj) =>{
                this.btnbitsB = this.btnbitsB & 0xD;
                BtnB.style.backgroundColor = "DarkRed";
                this.updateinput();
            });
            BtnB.addEventListener("mouseup",(obj) =>{
                this.btnbitsB = this.btnbitsB | 2;
                if(this.btnbitsK&2){
                    BtnB.style.backgroundColor = "";
                }
            });                        
        }


        const BtnA =  document.getElementById("BtnA");
        if(BtnA){
            BtnA.addEventListener("mousedown",(obj) =>{
                this.btnbitsB = this.btnbitsB & 0xE;
                BtnA.style.backgroundColor = "DarkRed";
                this.updateinput();                                
            });
            BtnA.addEventListener("mouseup",(obj) =>{
                this.btnbitsB = this.btnbitsB | 1;
                if(this.btnbitsK&1){
                    BtnA.style.backgroundColor = "";
                }
            });                        
        }

document.addEventListener("keydown",(event)=>{
    switch(event.key.toUpperCase()){
        case "S":
            this.dpadbitsK = this.dpadbitsK & 7;
            
            this.updateinput();       
            document.getElementById("DpadDown").style.backgroundColor = "LightGrey";              
        break;
        case "W":
            this.dpadbitsK = this.dpadbitsK & 0xB;
            
            this.updateinput();       
            document.getElementById("DpadUp").style.backgroundColor = "LightGrey";              
        break;
        case "A":
            this.dpadbitsK = this.dpadbitsK & 0xD;
            
            this.updateinput();    
            document.getElementById("DpadLeft").style.backgroundColor = "LightGrey";              
        break;
        case "D":
            this.dpadbitsK = this.dpadbitsK & 0xE;
            
            this.updateinput();     
            document.getElementById("DpadRight").style.backgroundColor = "LightGrey";              
        break;
        case "V":
            this.btnbitsK = this.btnbitsK & 7;
            
             this.updateinput();       
            document.getElementById("BtnStart").style.backgroundColor = "LightGrey";              
        break;
        case "B":
            this.btnbitsK = this.btnbitsK & 0xB;
            
            this.updateinput();        
            document.getElementById("BtnSelect").style.backgroundColor = "LightGrey";              
        break;
        case "J":
            this.btnbitsK = this.btnbitsK & 0xD;
            
            this.updateinput();
            document.getElementById("BtnB").style.backgroundColor = "DarkRed";              
        break;
        case "K":
            this.btnbitsK = this.btnbitsK & 0xE;
           
            this.updateinput();
            document.getElementById("BtnA").style.backgroundColor = "DarkRed";              
        break;                                 
    }
});

document.addEventListener("keyup",(event)=>{
    switch(event.key.toUpperCase()){
        case "S":
            this.dpadbitsK = this.dpadbitsK | 8;
            if(this.dpadbitsB&8){
              
                document.getElementById("DpadDown").style.backgroundColor = "";
            }     
        break;
        case "W":
            this.dpadbitsK = this.dpadbitsK | 4;
            if(this.dpadbitsB&4){
             
                document.getElementById("DpadUp").style.backgroundColor = "";
            }     
        break;
        case "A":
            this.dpadbitsK = this.dpadbitsK | 2;
            if(this.dpadbitsB&2){
             
                document.getElementById("DpadLeft").style.backgroundColor = "";
            }     
        break;
        case "D":
            this.dpadbitsK = this.dpadbitsK | 1;
            if(this.dpadbitsB&1){
            
                document.getElementById("DpadRight").style.backgroundColor = "";
            }     
        break;
        case "V":
            this.btnbitsK = this.btnbitsK | 8;
            if(this.btnbitsB&8){
             
                document.getElementById("BtnStart").style.backgroundColor = "";
            }     
        break;
        case "B":
            this.btnbitsK = this.btnbitsK | 4;
            if(this.btnbitsB&4){
             
                document.getElementById("BtnSelect").style.backgroundColor = "";
            }     
        break;
        case "J":
            this.btnbitsK = this.btnbitsK | 2;
            if(this.btnbitsB&2){
             
                document.getElementById("BtnB").style.backgroundColor = "";
            }     
        break;
        case "K":
            this.btnbitsK = this.btnbitsK | 1;
            if(this.btnbitsB&1){
            
                document.getElementById("BtnA").style.backgroundColor = "";
            }     
        break;                         
    }
});


    }
    reset(){
        this.btnbitsK = 0xF;
        this.dpadbitsK = 0xF;
        this.btnbitsB = 0xF;
        this.dpadbitsB = 0xF;      

        this.lastdih = 0xF;       
    }
    getsgn(){
            let btnmask = 0;
            let dpadmask = 0;
            const statusx = this.memory.PPUreadByte(0xFF00); 
            if(statusx&0x10){
                dpadmask = 0xF;
            }
            if(statusx&0x20){
                btnmask = 0xF;
            }
           
            return ((this.btnbitsB&this.btnbitsK)|btnmask) & ((this.dpadbitsB&this.dpadbitsK)|dpadmask);
    }


updateinput(){

    
    
    
    const newdih = this.getsgn() & 0xF;
    if((newdih ^ this.lastdih)&this.lastdih)this.memory.writeByte(0xFF0F,this.memory.readByte(0xFF0F)|0x10);

    
    this.lastdih = newdih;
      //  console.log(memory.readByte(0xFF00).toString(2));
}

}












