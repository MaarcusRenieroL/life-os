package com.lifeos.finance_tracker.controller;

import com.lifeos.finance_tracker.service.ReportService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/finance/reports")
@RequiredArgsConstructor
public class ReportController {

  private final ReportService reportService;

  @GetMapping("/tax/{year}")
  public ResponseEntity<byte[]> exportTaxYear(
      Authentication authentication, @PathVariable int year) {

    byte[] csvBytes = reportService.exportTaxYear(authentication, year);

    HttpHeaders headers = new HttpHeaders();

    headers.setContentType(MediaType.parseMediaType("text/csv"));
    headers.setContentDisposition(
        ContentDisposition.attachment().filename("tax-report-" + year + ".csv").build());

    return ResponseEntity.ok().headers(headers).body(csvBytes);
  }

  @GetMapping("/custom")
  public ResponseEntity<byte[]> generateCustomReport(
      Authentication authentication,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

    byte[] pdfBytes = reportService.generateCustomReport(authentication, startDate, endDate);

    HttpHeaders headers = new HttpHeaders();

    headers.setContentType(MediaType.APPLICATION_PDF);
    headers.setContentDisposition(
        ContentDisposition.attachment().filename("custom-report.pdf").build());

    return ResponseEntity.ok().headers(headers).body(pdfBytes);
  }
}
