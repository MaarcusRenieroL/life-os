package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.exception.InvalidRequestException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Compiles a LaTeX document to PDF with <a href="https://tectonic-typesetting.github.io">tectonic</a>
 * (a single self-contained binary bundled into the image). Tectonic runs XeTeX, so a few pdfTeX-only
 * primitives some templates use are stripped first - they only affect the PDF's ToUnicode map, not
 * the visible layout.
 */
@Component
public class LatexCompiler {

  private static final Logger log = LoggerFactory.getLogger(LatexCompiler.class);

  private static final Pattern GLYPHTOUNICODE =
      Pattern.compile("(?m)^\\s*\\\\input\\{glyphtounicode\\}.*$");
  private static final Pattern PDFGENTOUNICODE =
      Pattern.compile("(?m)^\\s*\\\\pdfgentounicode\\s*=?\\s*1.*$");
  private static final Pattern DOCUMENTCLASS =
      Pattern.compile("(\\\\documentclass(?:\\[[^\\]]*\\])?\\{[^}]*\\})");

  private final String tectonicBin;
  private final int timeoutSeconds;

  public LatexCompiler(
      @Value("${job-tracker.latex.tectonic-bin:tectonic}") String tectonicBin,
      @Value("${job-tracker.latex.timeout-seconds:90}") int timeoutSeconds) {
    this.tectonicBin = tectonicBin;
    this.timeoutSeconds = timeoutSeconds;
  }

  /** Renders {@code latexSource} to PDF bytes, or throws {@link InvalidRequestException} with the log tail. */
  public byte[] compile(String latexSource) {
    if (latexSource == null || latexSource.isBlank()) {
      throw new InvalidRequestException("No LaTeX source to compile");
    }

    Path dir = null;
    try {
      dir = Files.createTempDirectory("resume-tex-");
      Path tex = dir.resolve("resume.tex");
      Files.writeString(tex, sanitize(latexSource), StandardCharsets.UTF_8);

      Process process =
          new ProcessBuilder(tectonicBin, "-X", "compile", "resume.tex", "--outdir", ".")
              .directory(dir.toFile())
              .redirectErrorStream(true)
              .start();

      String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
      if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
        process.destroyForcibly();
        throw new InvalidRequestException("LaTeX compile timed out after " + timeoutSeconds + "s");
      }

      Path pdf = dir.resolve("resume.pdf");
      if (process.exitValue() != 0 || !Files.exists(pdf)) {
        log.warn("tectonic compile failed:\n{}", output);
        throw new InvalidRequestException("LaTeX compile failed:\n" + tail(output, 12));
      }
      return Files.readAllBytes(pdf);
    } catch (IOException exception) {
      throw new InvalidRequestException("LaTeX compile error: " + exception.getMessage());
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new InvalidRequestException("LaTeX compile was interrupted");
    } finally {
      deleteQuietly(dir);
    }
  }

  private static String sanitize(String source) {
    String s = GLYPHTOUNICODE.matcher(source).replaceAll("% (removed for XeTeX) \\\\input{glyphtounicode}");
    s = PDFGENTOUNICODE.matcher(s).replaceAll("% (removed for XeTeX) \\\\pdfgentounicode=1");
    // Resume templates routinely open an itemize before the first \item (skills/achievements
    // blocks). pdfLaTeX only warns; XeTeX errors. Neutralise that one error.
    s =
        DOCUMENTCLASS
            .matcher(s)
            .replaceFirst("$1\n\\\\makeatletter\\\\let\\\\@noitemerr\\\\relax\\\\makeatother");
    return s;
  }

  private static String tail(String text, int lines) {
    String[] all = text.strip().split("\n");
    int from = Math.max(0, all.length - lines);
    return String.join("\n", Arrays.copyOfRange(all, from, all.length));
  }

  private static void deleteQuietly(Path dir) {
    if (dir == null) {
      return;
    }
    try (Stream<Path> paths = Files.walk(dir)) {
      paths.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
    } catch (IOException ignored) {
      // best effort
    }
  }
}
