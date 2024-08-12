class BlockSet {
    constructor() {
        this.blocks = [];
        this.next = null;
        this.start = null;
        this.end = null;
        this.executing = true;
    }

    execute(controllers, callback) {
        let index = 0;

        const executeBlockWithDelay = () => {
            if (index < this.blocks.length && this.executing) { // Check if still executing
                const currentBlock = this.blocks[index];
                currentBlock.execute(controllers, () => {
                    index++;
                    executeBlockWithDelay();
                });
            } else if(this.executing) {
                callback();
            }
        };

        executeBlockWithDelay();
    }

    stopExecution() {
        this.executing = false;
        for (var block of this.blocks){
            block.stopExecution();
        }
    }

    addBlock(block) {
        this.blocks.push(block);
    }

    setStart(start) {
        this.start = start;
    }

    setEnd(end) {
        this.end = end;
    }
}