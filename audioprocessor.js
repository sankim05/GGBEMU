class AudioProcessor extends AudioWorkletProcessor 
{
    constructor(){
        super();

        this.bufferSize = 44100;

        this.bufferL = new Float32Array(this.bufferSize);
        this.bufferR = new Float32Array(this.bufferSize);
        
        this.bufferHead = 0; //read
        this.bufferTail = 0; //write
        
        

        this.port.onmessage = (event) => {
            const {left,right} = event.data;
            const len = left.length;
            for(let i=0;i<len;i++){
                this.bufferL[this.bufferTail] = left[i];
                this.bufferR[this.bufferTail] = right[i];
                this.bufferTail++;
            }


        };

    }

    process(inputs,outputs){
        const output = outputs[0];
        const channelL = output[0];
        const channelR = output[1];

        return true;
    }


}


registerProcessor('Audioprocessorreal', AudioProcessor);