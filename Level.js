class Level {
    constructor(id, doll_start_x, doll_start_y) {
        this.id = id;
        this.grid_n = 0;
        this.doll_start_x = doll_start_x;
        this.doll_start_y = doll_start_y;
        this.file_path = 'virtual_configs/level_' + id + '.txt';
        this.default_grid = [];
    }

    async load_file() {
        try {
            const response = await fetch(this.file_path);
            const data = await response.text();
            const lines = data.split('\n');
            this.grid_n = lines.length;
            let i = 0;

            for (const line of lines) {
                const words = line.trim().split(' ');

                for (const word of words) {
                    this.default_grid.push(new VirtualTile(i, word));
                    i += 1;
                }
            }
        } catch (error) {
            console.error('Error reading the file:', error);
        }
    }

    reset() {
        this.baby_x = this.doll_start_x;
        this.baby_y = this.doll_start_y;
    }

    static async create(id, doll_start_x, doll_start_y) {
        const level = new Level(id, doll_start_x, doll_start_y);
        await level.load_file();
        return level;
    }
}
