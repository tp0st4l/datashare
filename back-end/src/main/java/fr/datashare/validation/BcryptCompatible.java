package fr.datashare.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Vérifie qu'un mot de passe ne dépasse pas la limite de BCrypt (72 octets UTF-8). */
@Documented
@Constraint(validatedBy = BcryptCompatibleValidator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface BcryptCompatible {

    String message() default PasswordRules.TOO_LONG_MESSAGE;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
