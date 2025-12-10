import { IsNumber, IsString } from "class-validator";

export class CreateLayerDto {


    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsNumber()
    userId: string;

    @IsString()
    originalFileName: string;

    @IsNumber()
    createdBy: number;

    
}
