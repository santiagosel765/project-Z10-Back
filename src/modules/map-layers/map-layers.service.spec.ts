import { Test, TestingModule } from '@nestjs/testing';
import { MapLayersService } from './map-layers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MapLayer } from '../maps/entities/map-layer.entity';
import { Map } from '../maps/entities/map.entity';
import { Layer } from '../layers/entities/layer.entity';

describe('MapLayersService', () => {
  let service: MapLayersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapLayersService,
        {
          provide: getRepositoryToken(MapLayer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Map),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Layer),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MapLayersService>(MapLayersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
