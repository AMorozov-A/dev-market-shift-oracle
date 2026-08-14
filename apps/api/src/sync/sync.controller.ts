import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSyncRunDto, ListSyncRunsQueryDto } from './dto/sync.dto';
import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller('sync/runs')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @ApiOperation({ summary: 'Queue a market sync run' })
  @ApiCreatedResponse({ description: 'Sync run queued' })
  start(@Body() body: CreateSyncRunDto) {
    return this.syncService.startSync(body ?? {});
  }

  @Get()
  @ApiOperation({ summary: 'List sync runs' })
  @ApiOkResponse({ description: 'Paginated sync runs' })
  list(@Query() query: ListSyncRunsQueryDto) {
    return this.syncService.listSyncRuns(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sync run details' })
  @ApiOkResponse({ description: 'Sync run details with progress counters' })
  getOne(@Param('id') id: string) {
    return this.syncService.getSyncRun(id);
  }
}
