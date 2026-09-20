package com.lifeos.job_tracker.domains.record;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;

/** The resume-parse prompt asks for a plain number, but a resume that literally says "2.5+
 * years" tempts a model - especially a smaller local one - into echoing the "+" as part of the
 * value, which crashes strict Double deserialization and (for the primary provider) discards an
 * otherwise-good extraction. Strips any trailing non-numeric characters instead of failing. */
public class LenientYearsDeserializer extends JsonDeserializer<Double> {

  @Override
  public Double deserialize(JsonParser parser, DeserializationContext context) throws IOException {
    JsonNode node = parser.getCodec().readTree(parser);
    if (node == null || node.isNull()) {
      return null;
    }
    if (node.isNumber()) {
      return node.doubleValue();
    }
    String text = node.asText(null);
    if (text == null || text.isBlank()) {
      return null;
    }
    java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("[0-9]+(\\.[0-9]+)?").matcher(text);
    if (matcher.find()) {
      return Double.parseDouble(matcher.group());
    }
    return null;
  }
}
