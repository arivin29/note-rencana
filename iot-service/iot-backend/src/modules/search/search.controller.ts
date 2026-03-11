import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchResponseDto } from './dto/search.dto';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Global search across nodes, devices, alerts, projects, and owners',
    description: 'Searches across multiple entities with a single query. Results are filtered based on user permissions.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query string' })
  @ApiQuery({
    name: 'categories',
    required: false,
    description: 'Comma-separated categories to search (nodes,devices,alerts,projects,owners)',
    example: 'nodes,alerts',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results per category (1-20)', example: 5 })
  @ApiResponse({ status: 200, description: 'Search results', type: SearchResponseDto })
  async search(@Query() dto: SearchQueryDto, @Request() req: any): Promise<SearchResponseDto> {
    const user = req.user;
    return this.searchService.search(dto, user?.id, user?.role, user?.idOwner);
  }
}
