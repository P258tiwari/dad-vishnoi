import Image from "next/image";

export function DoctorsAtDoorMark({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      src="/brand/doctors-at-door.svg"
      alt="Doctors At Door"
      width={383}
      height={100}
      loading="eager"
      className={compact ? "h-9 w-auto" : "h-10 w-auto sm:h-11"}
    />
  );
}
