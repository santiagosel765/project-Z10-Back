import { Test, TestingModule } from '@nestjs/testing';
import { MapLayersController } from './map-layers.controller';
import { MapLayersService } from './map-layers.service';

describe('MapLayersController', () => {
  let controller: MapLayersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapLayersController],
      providers: [
        {
          provide: MapLayersService,
          useValue: {
            addLayerToMap: jest.fn(),
            getLayersByMap: jest.fn(),
            getMapsByLayer: jest.fn(),
            updateMapLayer: jest.fn(),
            removeLayerFromMap: jest.fn(),
            reorderLayers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MapLayersController>(MapLayersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
