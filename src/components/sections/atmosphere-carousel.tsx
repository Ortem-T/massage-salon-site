import Image from "next/image";

type AtmosphereImage = {
  src: string;
  alt: string;
};

type AtmosphereCarouselProps = {
  images: readonly AtmosphereImage[];
  label: string;
};

const atmosphereImageSizes = "(min-width: 1280px) 250px, (min-width: 1024px) 28vw, (min-width: 640px) 42vw, 78vw";

export function AtmosphereCarousel({ images, label }: AtmosphereCarouselProps) {
  return (
    <div
      className="raine-atmosphere-carousel focus-ring -mx-3 mt-8 overflow-x-auto overscroll-x-contain px-3 pb-3 [scrollbar-width:none] focus-visible:rounded-xl [&::-webkit-scrollbar]:hidden"
      tabIndex={0}
      aria-label={label}
    >
      <div className="raine-atmosphere-track flex w-max">
        <AtmosphereImageList images={images} />
        <AtmosphereImageList images={images} isDuplicate />
      </div>
    </div>
  );
}

type AtmosphereImageListProps = {
  images: readonly AtmosphereImage[];
  isDuplicate?: boolean;
};

function AtmosphereImageList({ images, isDuplicate = false }: AtmosphereImageListProps) {
  return (
    <ul className="flex gap-4 pr-4" aria-hidden={isDuplicate ? "true" : undefined}>
      {images.map((image) => (
        <li
          key={`${image.src}-${isDuplicate ? "duplicate" : "primary"}`}
          className="w-[78vw] max-w-[19rem] shrink-0 sm:w-[42vw] lg:w-[17.6rem] xl:w-[15.65rem]"
        >
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-muted shadow-sm">
            <Image
              src={image.src}
              alt={isDuplicate ? "" : image.alt}
              fill
              sizes={atmosphereImageSizes}
              className="object-cover transition-transform duration-700 ease-out hover:scale-[1.025]"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
