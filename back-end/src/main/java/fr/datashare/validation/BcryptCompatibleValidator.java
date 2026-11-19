package fr.datashare.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class BcryptCompatibleValidator implements ConstraintValidator<BcryptCompatible, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return !PasswordRules.exceedsBcryptLimit(value);
    }
}
