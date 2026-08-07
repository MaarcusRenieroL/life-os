package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.record.BulletSection;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PdfGenerationService {

  private static final float MARGIN = 50f;
  private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
  private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
  private static final float USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN;
  private static final float LINE_HEIGHT = 14f;

  public byte[] generateResumePdf(String title, String summary, List<BulletSection> sections)
      throws IOException {
    try (PDDocument document = new PDDocument()) {
      PDFont titleFont = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
      PDFont headingFont = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
      PDFont bodyFont = new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);

      PdfCursor cursor = new PdfCursor(document);

      cursor.writeParagraph(title, titleFont, 16f);
      cursor.addGap(8f);
      cursor.writeParagraph(summary, bodyFont, 11f);
      cursor.addGap(12f);

      for (BulletSection section : sections) {
        cursor.writeParagraph(section.heading(), headingFont, 12f);
        cursor.addGap(4f);

        for (String bullet : section.bullets()) {
          cursor.writeBullet(bullet, bodyFont, 11f);
        }

        cursor.addGap(10f);
      }

      cursor.close();

      ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
      document.save(outputStream);

      return outputStream.toByteArray();
    }
  }

  private static class PdfCursor {
    private final PDDocument document;
    private PDPage page;
    private PDPageContentStream contentStream;
    private float y;

    PdfCursor(PDDocument document) throws IOException {
      this.document = document;
      startNewPage();
    }

    private void startNewPage() throws IOException {
      page = new PDPage(PDRectangle.A4);
      document.addPage(page);

      contentStream = new PDPageContentStream(document, page);

      y = PAGE_HEIGHT - MARGIN;
    }

    private void ensureSpace() throws IOException {
      if (y < MARGIN + LINE_HEIGHT) {
        contentStream.close();

        startNewPage();
      }
    }

    void addGap(float gap) {
      y -= gap;
    }

    void writeParagraph(String text, PDFont font, float fontSize) throws IOException {
      if (text == null || text.isBlank()) {
        return;
      }

      for (String line : wrapLine(text, font, fontSize, USABLE_WIDTH)) {
        ensureSpace();

        contentStream.beginText();
        contentStream.setFont(font, fontSize);
        contentStream.newLineAtOffset(MARGIN, y);
        contentStream.showText(line);
        contentStream.endText();

        y -= LINE_HEIGHT;
      }
    }

    void writeBullet(String text, PDFont font, float fontSize) throws IOException {
      if (text == null || text.isBlank()) {
        return;
      }

      float bulletIndent = 14f;

      List<String> lines = wrapLine(text, font, fontSize, USABLE_WIDTH - bulletIndent);

      for (int i = 0; i < lines.size(); i++) {
        ensureSpace();

        contentStream.beginText();
        contentStream.setFont(font, fontSize);

        String prefix = i == 0 ? "• " : "  ";

        contentStream.newLineAtOffset(MARGIN + bulletIndent, y);
        contentStream.showText(prefix + lines.get(i));
        contentStream.endText();

        y -= LINE_HEIGHT;
      }
    }

    void close() throws IOException {
      contentStream.close();
    }

    private static List<String> wrapLine(String text, PDFont font, float fontSize, float maxWidth)
        throws IOException {
      List<String> lines = new ArrayList<>();
      StringBuilder current = new StringBuilder();

      for (String word : text.split("\\s+")) {
        String candidate = current.isEmpty() ? word : current + " " + word;
        float width = font.getStringWidth(candidate) / 1000 * fontSize;

        if (width > maxWidth && !current.isEmpty()) {
          lines.add(current.toString());
          current = new StringBuilder(word);
        } else {
          current = new StringBuilder(candidate);
        }
      }

      if (!current.isEmpty()) {
        lines.add(current.toString());
      }

      return lines;
    }
  }
}
