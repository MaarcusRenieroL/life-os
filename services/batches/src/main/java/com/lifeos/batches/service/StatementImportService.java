package com.lifeos.batches.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.parameters.InvalidJobParametersException;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.job.parameters.JobParametersBuilder;
import org.springframework.batch.core.launch.JobExecutionAlreadyRunningException;
import org.springframework.batch.core.launch.JobInstanceAlreadyCompleteException;
import org.springframework.batch.core.launch.JobOperator;
import org.springframework.batch.core.launch.JobRestartException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class StatementImportService {

  private final Job statementImportJob;

  private final JobOperator jobOperator;

  public void importStatement(UUID userId, MultipartFile file, UUID accountId)
      throws IOException,
          JobInstanceAlreadyCompleteException,
          JobExecutionAlreadyRunningException,
          InvalidJobParametersException,
          JobRestartException {

    Path tempFile = Files.createTempFile("statement-", ".pdf");
    file.transferTo(tempFile);

    JobParameters params =
        new JobParametersBuilder()
            .addString("filePath", tempFile.toString())
            .addString("accountId", accountId.toString())
            .addString("userId", userId.toString())
            .addLong("timestamp", System.currentTimeMillis())
            .toJobParameters();

    jobOperator.start(statementImportJob, params);
  }
}
