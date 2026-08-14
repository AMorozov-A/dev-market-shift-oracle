import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CompareQueryDto,
  MarketQueryDto,
  SkillsMatrixQueryDto,
  SkillsTrendingQueryDto,
  TrendsQueryDto,
} from './dto/market.dto';
import { MarketService } from './market.service';

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Market overview KPIs by role cluster' })
  @ApiOkResponse({ description: 'Aggregated overview for the selected period' })
  overview(@Query() query: MarketQueryDto) {
    return this.marketService.getOverview(query);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Time series trends by role cluster' })
  @ApiOkResponse({ description: 'Daily metric series' })
  trends(@Query() query: TrendsQueryDto) {
    return this.marketService.getTrends(query);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare role clusters for a period' })
  @ApiOkResponse({ description: 'Cluster comparison table' })
  compare(@Query() query: CompareQueryDto) {
    return this.marketService.getCompare(query);
  }
}

@ApiTags('skills')
@Controller('skills')
export class SkillsAnalyticsController {
  constructor(private readonly marketService: MarketService) {}

  @Get('trending')
  @ApiOperation({ summary: 'Trending skills within role clusters' })
  @ApiOkResponse({ description: 'Skill frequency and period change' })
  trending(@Query() query: SkillsTrendingQueryDto) {
    return this.marketService.getSkillsTrending(query);
  }

  @Get('matrix')
  @ApiOperation({ summary: 'Role cluster × skill matrix' })
  @ApiOkResponse({ description: 'Top skills per cluster' })
  matrix(@Query() query: SkillsMatrixQueryDto) {
    return this.marketService.getSkillsMatrix(query);
  }
}
