// Re-encrypts values written by com.lifeos.common.security.EncryptionService (AES-256-GCM, "iv:ciphertext", both base64).
//   java scripts/RotateSecret.java <old-base64-key> <new-base64-key> < rows.tsv > rotated.tsv
// stdin/stdout are "id<TAB>ciphertext" lines. Exits non-zero, writing nothing useful, if any row fails to
// decrypt with the old key, so a wrong key can never half-rotate a table.
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class RotateSecret {
  public static void main(String[] args) throws Exception {
    var oldKey = new SecretKeySpec(Base64.getDecoder().decode(args[0]), "AES");
    var newKey = new SecretKeySpec(Base64.getDecoder().decode(args[1]), "AES");
    var in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    var out = new StringBuilder();
    int n = 0;
    for (String line; (line = in.readLine()) != null; ) {
      if (line.isBlank()) continue;
      String[] cols = line.split("\t", 2);
      String[] parts = cols[1].split(":", 2);
      var dec = Cipher.getInstance("AES/GCM/NoPadding");
      dec.init(Cipher.DECRYPT_MODE, oldKey, new GCMParameterSpec(128, Base64.getDecoder().decode(parts[0])));
      byte[] plain = dec.doFinal(Base64.getDecoder().decode(parts[1]));
      byte[] iv = new byte[12];
      new SecureRandom().nextBytes(iv);
      var enc = Cipher.getInstance("AES/GCM/NoPadding");
      enc.init(Cipher.ENCRYPT_MODE, newKey, new GCMParameterSpec(128, iv));
      out.append(cols[0]).append('\t').append(Base64.getEncoder().encodeToString(iv)).append(':').append(Base64.getEncoder().encodeToString(enc.doFinal(plain))).append('\n');
      n++;
    }
    System.out.print(out);
    System.err.println("re-encrypted " + n + " value(s)");
  }
}
