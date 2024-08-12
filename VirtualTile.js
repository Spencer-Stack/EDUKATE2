class VirtualTile {
    constructor(index, tile_type) {
        this.index = index;
        this.tile_type = new TileType(tile_type);
        this.element = this.createElement();
    }

    createElement() {
        const cell = $('<div></div>');
        if (this.tile_type.img_path != "blank"){
            let id = this.tile_type.name == "the_doll" ? 'id="baby_image"' : "";
            const img = $('<img '+id+' class="tile_img" src="'+this.tile_type.img_path+'">'); // Replace with your image URL
            cell.append(img); // Append the img to the div
        }
        return cell;
    }
}