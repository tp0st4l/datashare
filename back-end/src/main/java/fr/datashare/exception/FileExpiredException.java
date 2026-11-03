package fr.datashare.exception;

public class FileExpiredException extends RuntimeException {
    public FileExpiredException() {
        super("Ce fichier n'est plus disponible : le lien a expiré");
    }
}