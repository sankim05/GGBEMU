class AudioProcessor extends AudioWorkletProcessor 
{
    constructor(){
        super();

        this.bufferSize = 8192;

        this.bufferL = new Float32Array(this.bufferSize);
        this.bufferR = new Float32Array(this.bufferSize);
        
        this.bufferHead = 0; //read
        this.bufferTail = 0; //write
        this.bufferAvailable = 0;
       
        
        this.isBuffering = true;
        this.BUFFER_THRESHOLD = 2205; 


        this.port.onmessage = (event) => {
            
            const {left,right} = event.data;
            const len = left.length;
            for(let i=0;i<len;i++){
                if(this.bufferAvailable>=this.bufferSize){
                    break;
                }
                this.bufferL[this.bufferTail] = left[i];
                this.bufferR[this.bufferTail] = right[i];
                this.bufferTail = (this.bufferTail+1)%this.bufferSize;
                this.bufferAvailable++;
            }


        };

    }

    process(inputs,outputs){
        const output = outputs[0];
        const channelL = output[0];
        const channelR = output[1];
        const len = channelL.length;


        if(this.isBuffering){
            if(this.bufferAvailable >= this.BUFFER_THRESHOLD){
                this.isBuffering = false;
            }else{
                for(let i=0;i<len;i++){
                    channelL[i] = 0;
                    channelR[i] = 0;
                }
                return true;
            }
        }


        if(this.bufferAvailable>=len){
            for(let i=0;i<len;i++){
                channelL[i] = this.bufferL[this.bufferHead];
                channelR[i] = this.bufferR[this.bufferHead];

                this.bufferHead = (this.bufferHead+1)%this.bufferSize;
                this.bufferAvailable--;
            }



        }else{
            for(let i=0;i<len;i++){
                channelL[i] = 0;
                channelR[i] = 0;


            }

        }

        return true;
    }


}


registerProcessor('Audioprocessorreal', AudioProcessor);