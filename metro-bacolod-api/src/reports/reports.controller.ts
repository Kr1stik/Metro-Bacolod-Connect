import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CreateReportDto, UpdateReportStatusDto } from './dto/report.dto';

@Controller('reports')
@UseGuards(FirebaseAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // POST /reports - submit a report
  @Post()
  create(@Body() body: CreateReportDto, @Req() req: any) {
    return this.reportsService.createReport(req.user.uid, body);
  }

  // GET /reports/mine - get own reports
  @Get('mine')
  getMyReports(@Req() req: any) {
    return this.reportsService.getReportsByUser(req.user.uid);
  }

  // GET /reports - admin: list all reports
  @Get()
  @UseGuards(AdminGuard)
  findAll(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.reportsService.findAll(status, limit ? parseInt(limit) : 50);
  }

  // GET /reports/:id - admin: get single report
  @Get(':id')
  @UseGuards(AdminGuard)
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  // PUT /reports/:id/status - admin: update status
  @Put(':id/status')
  @UseGuards(AdminGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateReportStatusDto,
    @Req() req: any,
  ) {
    return this.reportsService.updateStatus(id, req.user.uid, body.status, body.adminNote);
  }
}
