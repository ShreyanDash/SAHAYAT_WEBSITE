CREATE TABLE `interestRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`consentedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmationSentAt` timestamp,
	`adminNotifiedAt` timestamp,
	`lastEmailError` text,
	CONSTRAINT `interestRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `interestRegistrations_email_unique` UNIQUE(`email`)
);
