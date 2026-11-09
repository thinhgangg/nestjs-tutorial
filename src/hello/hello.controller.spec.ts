import { Test, TestingModule } from '@nestjs/testing';
import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';

describe('HelloController', () => {
  let controller: HelloController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelloController],
      providers: [
        {
          provide: HelloService,
          useValue: {
            getHello: () => 'Hello World!',
          },
        },
      ],
    }).compile();

    controller = module.get<HelloController>(HelloController);
  });

  it('should return hello message', () => {
    expect(controller.getHello()).toBe('Hello World!');
  });
});
