import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListForecastsQueryDto } from './dto/forecast.dto';
import { ForecastService } from './forecast.service';

@ApiTags('forecasts')
@Controller('forecasts')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get()
  @ApiOperation({ summary: 'List latest generated forecasts' })
  @ApiOkResponse({ description: 'Forecast list' })
  list(@Query() query: ListForecastsQueryDto) {
    return this.forecastService.list(query);
  }

  @Get(':id/explain')
  @ApiOperation({ summary: 'Explain forecast model, risks and drivers' })
  @ApiOkResponse({ description: 'Human-readable explanation payload' })
  explain(@Param('id') id: string) {
    return this.forecastService.explain(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get forecast with points and backtest' })
  @ApiOkResponse({ description: 'Forecast details' })
  getOne(@Param('id') id: string) {
    return this.forecastService.getOne(id);
  }
}
