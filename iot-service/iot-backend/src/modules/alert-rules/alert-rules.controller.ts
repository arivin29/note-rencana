import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AlertRulesService } from './alert-rules.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { AlertRuleResponseDto, AlertRuleDetailedResponseDto } from './dto/alert-rule-response.dto';

@ApiTags('Alert Rules')
@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly alertRulesService: AlertRulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new alert rule' })
  @ApiResponse({ status: 201, type: AlertRuleResponseDto })
  create(@Body() createDto: CreateAlertRuleDto): Promise<AlertRuleResponseDto> {
    return this.alertRulesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all alert rules' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'idSensorChannel', required: false, type: String })
  @ApiQuery({ name: 'ruleType', required: false, type: String })
  @ApiQuery({ name: 'severity', required: false, type: String })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiResponse({ status: 200 })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idSensorChannel') idSensorChannel?: string,
    @Query('ruleType') ruleType?: string,
    @Query('severity') severity?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.alertRulesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      idSensorChannel,
      ruleType,
      severity,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  @ApiResponse({ status: 200, type: AlertRuleResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AlertRuleResponseDto> {
    return this.alertRulesService.findOne(id);
  }

  @Get(':id/detailed')
  @ApiOperation({ summary: 'Get alert rule with event statistics' })
  @ApiResponse({ status: 200, type: AlertRuleDetailedResponseDto })
  findOneDetailed(@Param('id', ParseUUIDPipe) id: string): Promise<AlertRuleDetailedResponseDto> {
    return this.alertRulesService.findOneDetailed(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update alert rule' })
  @ApiResponse({ status: 200, type: AlertRuleResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateAlertRuleDto,
  ): Promise<AlertRuleResponseDto> {
    return this.alertRulesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete alert rule' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.alertRulesService.remove(id);
  }
}
