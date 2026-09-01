package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.exception.InvalidRequestException;
import java.io.IOException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

@Component
public class PdfTextExtractor {

  public String extract(byte[] pdfBytes) {
    try (PDDocument document = Loader.loadPDF(pdfBytes)) {
      String text = new PDFTextStripper().getText(document);
      if (text == null || text.isBlank()) {
        throw new InvalidRequestException("Could not extract any text from the PDF");
      }
      return text.strip();
    } catch (IOException exception) {
      throw new InvalidRequestException("Uploaded file is not a readable PDF");
    }
  }
}
