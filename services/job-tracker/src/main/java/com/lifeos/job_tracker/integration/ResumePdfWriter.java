package com.lifeos.job_tracker.integration;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

/**
 * Renders lightweight Markdown (headings, bullets, paragraphs, **bold** stripped) to a plain,
 * ATS-friendly PDF using PDFBox only — no HTML/CSS engine, so nothing to break offline.
 */
@Component
public class ResumePdfWriter {

  private static final PDRectangle PAGE = PDRectangle.LETTER;
  private static final float MARGIN = 54f;
  private static final float LEADING = 14f;

  public byte[] fromMarkdown(String markdown) {
    try (PDDocument document = new PDDocument();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {

      Cursor cursor = new Cursor(document);
      for (String rawLine : markdown.replace("\r", "").split("\n")) {
        String line = rawLine.stripTrailing();
        if (line.isBlank()) {
          cursor.gap();
          continue;
        }
        if (line.startsWith("# ")) {
          cursor.write(strip(line.substring(2)), new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 17f);
        } else if (line.startsWith("## ")) {
          cursor.gap();
          cursor.write(strip(line.substring(3)), new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 13f);
        } else if (line.startsWith("### ")) {
          cursor.write(strip(line.substring(4)), new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11f);
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          cursor.write("• " + strip(line.substring(2)), new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10.5f);
        } else {
          cursor.write(strip(line), new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10.5f);
        }
      }
      cursor.close();
      document.save(out);
      return out.toByteArray();
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to render resume PDF", exception);
    }
  }

  private static String strip(String text) {
    return text.replace("**", "").replace("__", "").replace("`", "").trim();
  }

  /** Tracks the write position, opening new pages as needed. */
  private static final class Cursor {
    private final PDDocument document;
    private PDPageContentStream stream;
    private float y;

    Cursor(PDDocument document) throws IOException {
      this.document = document;
      newPage();
    }

    private void newPage() throws IOException {
      if (stream != null) {
        stream.close();
      }
      PDPage page = new PDPage(PAGE);
      document.addPage(page);
      stream = new PDPageContentStream(document, page);
      y = PAGE.getHeight() - MARGIN;
    }

    void gap() {
      y -= LEADING * 0.6f;
    }

    void write(String text, PDType1Font font, float size) throws IOException {
      float maxWidth = PAGE.getWidth() - 2 * MARGIN;
      for (String wrapped : wrap(text, font, size, maxWidth)) {
        if (y <= MARGIN) {
          newPage();
        }
        stream.beginText();
        stream.setFont(font, size);
        stream.newLineAtOffset(MARGIN, y);
        stream.showText(wrapped);
        stream.endText();
        y -= LEADING;
      }
    }

    void close() throws IOException {
      stream.close();
    }

    private static List<String> wrap(String text, PDType1Font font, float size, float maxWidth)
        throws IOException {
      List<String> lines = new ArrayList<>();
      StringBuilder current = new StringBuilder();
      for (String word : text.split(" ")) {
        String candidate = current.isEmpty() ? word : current + " " + word;
        if (font.getStringWidth(sanitize(candidate)) / 1000 * size > maxWidth && !current.isEmpty()) {
          lines.add(sanitize(current.toString()));
          current = new StringBuilder(word);
        } else {
          current = new StringBuilder(candidate);
        }
      }
      if (!current.isEmpty()) {
        lines.add(sanitize(current.toString()));
      }
      return lines.isEmpty() ? List.of("") : lines;
    }

    private static String sanitize(String text) {
      return text.replaceAll("[^\\x20-\\x7E]", "-");
    }
  }
}
